import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Group, Rect, Circle, Text, Image } from 'react-konva';
import Konva from 'konva';
import { useTheme } from '@/contexts/ThemeContext';
import type { TableStatus } from '@/store/api/types';

declare global {
  interface Window {
    __restohandTableImage?: HTMLImageElement;
  }
}

const TABLE_IMAGE_SRC = '/images/table.png';

export interface FloorPlanTable {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: 'rectangle' | 'circle' | 'square';
  label: string;
  capacity: number;
  zone?: string;
  color: string;
}

interface EnhancedTableShapeProps {
  table: FloorPlanTable;
  status?: TableStatus;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  scale: number;
  isDraggable?: boolean;
  showStatusIndicators?: boolean;
}

export const EnhancedTableShape: React.FC<EnhancedTableShapeProps> = ({
  table,
  status,
  isSelected,
  onSelect,
  onDragEnd,
  scale,
  isDraggable = false,
  showStatusIndicators = true,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Calculate status-based styling
  const statusColor = useMemo(() => {
    if (!status) return '#22c55e'; // green - available

    switch (status.status) {
      case 'available':
        return '#22c55e'; // green
      case 'reserved':
        return '#3b82f6'; // blue
      case 'cleaning':
        return '#6b7280'; // grey
      case 'occupied':
        const occupiedTime = status.occupiedDuration || 0;
        if (occupiedTime < 3600000) return '#eab308'; // yellow < 1hr
        if (occupiedTime < 7200000) return '#f97316'; // orange 1-2hr
        return '#ef4444'; // red > 2hr
      default:
        return '#6b7280'; // grey
    }
  }, [status]);

  const hasActiveOrder = status?.currentBillAmount && status.currentBillAmount > 0;
  const isOccupied = status?.status === 'occupied';
  const hasPartySize = status?.currentPartySize && status.currentPartySize > 0;

  const labelFill = useMemo(
    () => (isDarkMode ? '#FFFFFF' : '#000000'),
    [isDarkMode]
  );

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

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Group
      ref={groupRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation}
      draggable={isDraggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
    >
      {/* Table Base Image */}
      {tableImage && (
        <Image
          image={tableImage}
          width={table.width}
          height={table.width}
          offsetX={table.width / 2}
          offsetY={table.width / 2}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Status Color Overlay */}
      <Rect
        width={table.width}
        height={table.height}
        offsetX={table.width / 2}
        offsetY={table.height / 2}
        fill={statusColor}
        opacity={0.3}
        cornerRadius={table.shape === 'square' ? 8 : 4}
        listening={false}
      />

      {/* Selection Highlight */}
      {isSelected && (
        <Rect
          width={table.width + 8}
          height={table.height + 8}
          offsetX={(table.width + 8) / 2}
          offsetY={(table.height + 8) / 2}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dash={[4, 4]}
          opacity={0.9}
          cornerRadius={8}
          listening={false}
          fillEnabled={false}
        />
      )}

      {/* Table Number/Label */}
      <Text
        text={String(table.label || '')}
        fontSize={Math.max(12, 14 * scale)}
        fontFamily="Inter, system-ui, sans-serif"
        fill={labelFill}
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        width={table.width}
        height={table.height * 0.4}
        offsetX={table.width / 2}
        offsetY={(table.height * 0.4) / 2 - 5}
        listening={false}
      />

      {showStatusIndicators && (
        <>
          {/* Party Size Indicator */}
          {isOccupied && hasPartySize && (
            <>
              <Circle
                x={table.width / 2 - 12}
                y={-table.height / 2 + 12}
                radius={10}
                fill="hsl(var(--primary))"
                stroke="hsl(var(--background))"
                strokeWidth={2}
                listening={false}
              />
              <Text
                x={table.width / 2 - 12}
                y={-table.height / 2 + 12}
                text={String(status?.currentPartySize || '0')}
                fontSize={10}
                fontFamily="Inter, system-ui, sans-serif"
                fill="white"
                align="center"
                verticalAlign="middle"
                width={20}
                height={20}
                offsetX={10}
                offsetY={10}
                listening={false}
              />
            </>
          )}

          {/* Order Indicator */}
          {hasActiveOrder && (
            <>
              <Circle
                x={-table.width / 2 + 12}
                y={-table.height / 2 + 12}
                radius={10}
                fill="hsl(var(--chart-3))"
                stroke="hsl(var(--background))"
                strokeWidth={2}
                listening={false}
              />
              <Text
                x={-table.width / 2 + 12}
                y={-table.height / 2 + 12}
                text="₹"
                fontSize={8}
                fontFamily="Inter, system-ui, sans-serif"
                fill="white"
                align="center"
                verticalAlign="middle"
                width={20}
                height={20}
                offsetX={10}
                offsetY={10}
                listening={false}
              />
            </>
          )}

          {/* Duration Display for Occupied Tables */}
          {isOccupied && status?.occupiedDuration && (
            <Text
              text={String(formatDuration(status.occupiedDuration))}
              fontSize={8}
              fontFamily="Inter, system-ui, sans-serif"
              fill={labelFill}
              align="center"
              verticalAlign="middle"
              width={table.width}
              height={table.height * 0.3}
              offsetX={table.width / 2}
              offsetY={(table.height * 0.3) / 2 - 20}
              listening={false}
            />
          )}

          {/* Bill Amount for Active Orders */}
          {hasActiveOrder && (
            <Text
              text={`₹${String((status?.currentBillAmount || 0).toFixed(0))}`}
              fontSize={8}
              fontFamily="Inter, system-ui, sans-serif"
              fill={labelFill}
              align="center"
              verticalAlign="middle"
              width={table.width}
              height={table.height * 0.3}
              offsetX={table.width / 2}
              offsetY={(table.height * 0.3) / 2 + 15}
              listening={false}
            />
          )}

          {/* Status Badge */}
          <Rect
            x={-table.width / 2}
            y={table.height / 2 - 12}
            width={table.width}
            height={12}
            fill={statusColor}
            opacity={0.8}
            cornerRadius={2}
            listening={false}
          />
          <Text
            text={status?.status.toUpperCase() || 'AVAILABLE'}
            x={-table.width / 2}
            y={table.height / 2 - 12}
            fontSize={8}
            fontFamily="Inter, system-ui, sans-serif"
            fill="white"
            align="center"
            verticalAlign="middle"
            width={table.width}
            height={12}
            listening={false}
          />
        </>
      )}

      {/* Hover effect */}
      <Rect
        width={table.width + 4}
        height={table.height + 4}
        offsetX={(table.width + 4) / 2}
        offsetY={(table.height + 4) / 2}
        fill="transparent"
        stroke="transparent"
        strokeWidth={0}
        cornerRadius={6}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = 'pointer';
          }
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = 'default';
          }
        }}
      />
    </Group>
  );
};