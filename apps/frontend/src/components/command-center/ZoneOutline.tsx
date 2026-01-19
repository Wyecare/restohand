import React from 'react';
import { Rect, Text, Group, Circle } from 'react-konva';
import type { EnhancedRestaurantTable } from '@/store/api/types';

interface ZoneOutlineProps {
  zoneName: string;
  tables: EnhancedRestaurantTable[];
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isDarkMode: boolean;
}

export const ZoneOutline: React.FC<ZoneOutlineProps> = ({
  zoneName,
  tables,
  x,
  y,
  width,
  height,
  color,
  isDarkMode,
}) => {
  const strokeColor = color;
  const fillColor = `${color}15`; // 15 is roughly 8% opacity in hex
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';

  return (
    <Group>
      {/* Zone background */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
        strokeDashArray={[5, 5]}
        cornerRadius={8}
        listening={false}
      />

      {/* Zone label */}
      <Text
        text={`${zoneName} (${tables.length})`}
        x={x + 10}
        y={y + 8}
        fontSize={14}
        fontFamily="Inter, system-ui, sans-serif"
        fill={textColor}
        fontStyle="bold"
        listening={false}
      />

    </Group>
  );
};