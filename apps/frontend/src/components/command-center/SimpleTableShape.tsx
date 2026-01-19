import React, { useRef, useMemo } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { useTheme } from '@/contexts/ThemeContext';
import type { TableStatus } from '@/store/api/types';
import type Konva from 'konva';

interface TableData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  shape?: 'square' | 'rectangle' | 'circle';
  label: string;
  capacity: number;
  zone?: string;
  color: string;
}

interface SimpleTableShapeProps {
  table: TableData;
  status?: TableStatus;
  isSelected?: boolean;
  onSelect?: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  scale?: number;
  isDraggable?: boolean;
  showStatusIndicators?: boolean;
}

export const SimpleTableShape: React.FC<SimpleTableShapeProps> = ({
  table,
  status,
  isSelected = false,
  onSelect,
  onDragEnd,
  scale = 1,
  isDraggable = false,
  showStatusIndicators = false,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

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
        return '#6b7280';
    }
  }, [status]);

  const labelFill = useMemo(() => {
    return isDarkMode ? '#FFFFFF' : '#000000';
  }, [isDarkMode]);

  const isOccupied = status?.status === 'occupied';
  const hasPartySize = Boolean(status?.currentPartySize && status.currentPartySize > 0);
  const hasActiveOrder = Boolean(status?.currentBillAmount && status.currentBillAmount > 0);

  return (
    <Group
      ref={groupRef}
      x={table.x}
      y={table.y}
      rotation={table.rotation || 0}
      draggable={isDraggable}
      onDragEnd={onDragEnd}
    >
      {/* Clickable Area - transparent overlay for click detection */}
      <Rect
        width={table.width}
        height={table.height}
        offsetX={table.width / 2}
        offsetY={table.height / 2}
        fill="transparent"
        onClick={onSelect}
        onTap={onSelect}
        listening={true}
      />

      {/* Table Base */}
      <Rect
        width={table.width}
        height={table.height}
        offsetX={table.width / 2}
        offsetY={table.height / 2}
        fill={statusColor}
        opacity={0.9}
        cornerRadius={8}
        listening={false}
      />

      {/* Selection Highlight */}
      {isSelected && (
        <Rect
          width={table.width + 8}
          height={table.height + 8}
          offsetX={(table.width + 8) / 2}
          offsetY={(table.height + 8) / 2}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[4, 4]}
          opacity={0.9}
          cornerRadius={12}
          listening={false}
          fillEnabled={false}
        />
      )}

      {/* Table Label */}
      <Text
        text={String(table.label || '')}
        fontSize={Math.max(12, 14 * scale)}
        fontFamily="Inter, system-ui, sans-serif"
        fill="white"
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        width={table.width}
        height={table.height * 0.4}
        offsetX={table.width / 2}
        offsetY={(table.height * 0.4) / 2 - 5}
        listening={false}
      />

      {/* Status indicators */}
      {showStatusIndicators && (
        <>
          {/* Party Size Indicator */}
          {isOccupied && hasPartySize && (
            <>
              <Circle
                x={table.width / 2 - 12}
                y={-table.height / 2 + 12}
                radius={10}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={2}
                listening={false}
              />
              <Text
                x={table.width / 2 - 12}
                y={-table.height / 2 + 12}
                text={String(status?.currentPartySize || 0)}
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
                fill="#f97316"
                stroke="white"
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
        </>
      )}
    </Group>
  );
};