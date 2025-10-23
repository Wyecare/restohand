import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Group, Rect, Circle, Text, Transformer, Image } from 'react-konva';
import Konva from 'konva';
import {
  FloorPlanTable,
  TableStatus,
  TableStatusType,
} from '@/store/api/floorPlansApi';
import { useTheme } from '@/contexts/ThemeContext';

declare global {
  interface Window {
    __restohandTableImage?: HTMLImageElement;
  }
}

const TABLE_IMAGE_SRC = '/images/table.png';

interface TableShapeProps {
  table: FloorPlanTable;
  status?: TableStatus;
  isSelected: boolean;
  color: string;
  onSelect: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void;
  scale: number;
  isDraggable?: boolean;
}

export const TableShape: React.FC<TableShapeProps> = ({
  table,
  status,
  isSelected,
  color,
  onSelect,
  onDragEnd,
  onTransformEnd,
  scale,
  isDraggable = true,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const hasOrders = status?.currentOrders && status.currentOrders.length > 0;
  const isOccupied = status?.status === TableStatusType.Occupied;

  const tableFill = useMemo(() => {
    return 'transparent';
  }, [color, isDarkMode]);

  // Adjusted label color for better visibility in both modes
  const labelFill = useMemo(
    () => (isDarkMode ? '#FFFFFF' : '#000000'),
    [isDarkMode]
  );

  const strokeColor = useMemo(() => 'hsl(var(--border) / 0.5)', []);

  const [tableImage, setTableImage] = useState<HTMLImageElement | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.__restohandTableImage ?? null;
  });

  useEffect(() => {
    if (tableImage) return;
    if (typeof window === 'undefined') return;

    let isMounted = true;
    const cached = window.__restohandTableImage;
    if (cached) {
      setTableImage(cached);
      return;
    }

    const loader = new window.Image();
    loader.src = TABLE_IMAGE_SRC;
    loader.onload = () => {
      if (!isMounted) return;
      window.__restohandTableImage = loader;
      setTableImage(loader);
    };

    return () => {
      isMounted = false;
    };
  }, [tableImage]);

  const circleRadius = useMemo(
    () => Math.min(table.width, table.height) / 2,
    [table.width, table.height]
  );

  // Update transformer when selection changes
  useEffect(() => {
    if (isSelected && transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Group
        ref={groupRef}
        x={table.x}
        y={table.y}
        rotation={table.rotation}
        draggable={isDraggable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        {/* Table Visual */}
        {tableImage && (
          <Image
            image={tableImage}
            width={table.width}
            height={table.width} // Keep aspect ratio square for table image
            offsetX={table.width / 2}
            offsetY={table.width / 2}
            opacity={0.95}
            listening={false}
          />
        )}

        {/* Color overlay for table status */}
        <Rect
          width={table.width}
          height={table.height}
          offsetX={table.width / 2}
          offsetY={table.height / 2}
          fill={tableFill}
          opacity={status?.status ? 0.35 : 0.22}
          cornerRadius={table.shape === 'square' ? 8 : 4}
          listening={false}
        />

        {/* Selection Aura */}
        {isSelected && (
          <Rect
            width={table.width + 12}
            height={table.height + 12}
            offsetX={(table.width + 12) / 2}
            offsetY={(table.height + 12) / 2}
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            dash={[6, 6]}
            opacity={0.9}
            cornerRadius={12}
            listening={false}
            fillEnabled={false}
          />
        )}

        {/* Table Label */}
        <Text
          text={table.label}
          fontSize={Math.max(12, 14 * scale)}
          fontFamily="Inter, system-ui, sans-serif"
          fill={labelFill}
          fontStyle="bold"
          align="center"
          verticalAlign="bottom"
          width={table.width}
          height={table.height}
          offsetX={table.width / 2}
          offsetY={table.height / 2}
        />

        {/* Party Size Indicator */}
        {isOccupied && status?.currentPartySize && (
          <Circle
            x={table.width / 2 - 8}
            y={-table.height / 2 + 8}
            radius={8}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
          />
        )}

        {isOccupied && status?.currentPartySize && (
          <Text
            x={table.width / 2 - 8}
            y={-table.height / 2 + 8}
            text={status.currentPartySize.toString()}
            fontSize={10}
            fontFamily="Inter, system-ui, sans-serif"
            fill="hsl(var(--primary-foreground))"
            align="center"
            verticalAlign="middle"
            width={16}
            height={16}
            offsetX={8}
            offsetY={8}
          />
        )}

        {/* Order Count Indicator */}
        {hasOrders && (
          <Circle
            x={-table.width / 2 + 8}
            y={-table.height / 2 + 8}
            radius={8}
            fill="hsl(var(--chart-3))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
          />
        )}

        {hasOrders && (
          <Text
            x={-table.width / 2 + 8}
            y={-table.height / 2 + 8}
            text={status?.currentOrders.length.toString() || '0'}
            fontSize={10}
            fontFamily="Inter, system-ui, sans-serif"
            fill="hsl(var(--primary-foreground))"
            align="center"
            verticalAlign="middle"
            width={16}
            height={16}
            offsetX={8}
            offsetY={8}
          />
        )}

        {/* Priority Indicator */}
        {status?.priority === 'urgent' && (
          <Rect
            x={-table.width / 2}
            y={table.height / 2 - 4}
            width={table.width}
            height={4}
            fill="hsl(var(--destructive))"
            cornerRadius={2}
          />
        )}

        {status?.priority === 'high' && (
          <Rect
            x={-table.width / 2}
            y={table.height / 2 - 4}
            width={table.width}
            height={4}
            fill="hsl(var(--chart-5))"
            cornerRadius={2}
          />
        )}
      </Group>

      {/* Transformer for resize/rotate when selected */}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize - minimum 40px
            if (newBox.width < 40 || newBox.height < 40) {
              return oldBox;
            }
            return newBox;
          }}
          anchorFill="hsl(var(--primary))"
          anchorStroke="hsl(var(--background))"
          borderStroke="hsl(var(--primary))"
          anchorSize={8}
          anchorCornerRadius={2}
        />
      )}
    </>
  );
};
