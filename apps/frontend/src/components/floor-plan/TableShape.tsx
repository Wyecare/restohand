import React, { useRef, useEffect, useMemo } from 'react';
import { Group, Rect, Circle, Text, Transformer } from 'react-konva';
import { FloorPlanTable, TableStatus, TableStatusType } from '@/store/api/floorPlansApi';
import Konva from 'konva';
import { useTheme } from '@/contexts/ThemeContext';

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

  const shouldAnimate = status?.status === TableStatusType.NeedsAttention;
  const hasOrders = status?.currentOrders && status.currentOrders.length > 0;
  const isOccupied = status?.status === TableStatusType.Occupied;

  const tableFill = useMemo(
    () =>
      color ??
      (isDarkMode ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.12)'),
    [color, isDarkMode]
  );

  const tableStroke = useMemo(
    () =>
      isSelected
        ? 'hsl(var(--primary))'
        : isDarkMode
        ? 'rgba(148, 163, 184, 0.55)'
        : 'rgba(100, 116, 139, 0.45)',
    [isSelected, isDarkMode]
  );

  const labelFill = useMemo(
    () => (isDarkMode ? 'rgba(248, 250, 252, 0.92)' : 'rgba(17, 24, 39, 0.85)'),
    [isDarkMode]
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
      {/* Table Shape */}
      {table.shape === 'circle' ? (
        <Circle
          radius={table.width / 2}
          fill={tableFill}
          stroke={tableStroke}
          strokeWidth={isSelected ? 3 : 1}
          shadowBlur={isSelected ? 10 : shouldAnimate ? 8 : 4}
          shadowOpacity={0.3}
          shadowColor={shouldAnimate ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'}
          name="table-shape"
        />
      ) : (
        <Rect
          width={table.width}
          height={table.height}
          offsetX={table.width / 2}
          offsetY={table.height / 2}
          fill={tableFill}
          stroke={tableStroke}
          strokeWidth={isSelected ? 3 : 1}
          cornerRadius={table.shape === 'square' ? 8 : 4}
          shadowBlur={isSelected ? 10 : shouldAnimate ? 8 : 4}
          shadowOpacity={0.3}
          shadowColor={shouldAnimate ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'}
          name="table-shape"
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
        verticalAlign="middle"
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
