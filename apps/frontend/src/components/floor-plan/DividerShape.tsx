import React from 'react';
import { Group, Line, Text, Rect } from 'react-konva';
import { FloorPlanDivider } from '@/store/api/floorPlansApi';

interface DividerShapeProps {
  divider: FloorPlanDivider;
  isSelected?: boolean;
  onSelect?: () => void;
  scale?: number;
}

export const DividerShape: React.FC<DividerShapeProps> = ({
  divider,
  isSelected = false,
  onSelect,
  scale = 1,
}) => {
  const x1 = divider.x1 * scale;
  const y1 = divider.y1 * scale;
  const x2 = divider.x2 * scale;
  const y2 = divider.y2 * scale;
  const thickness = divider.thickness * scale;

  // Calculate line length and angle
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

  // Calculate door position if it's a door
  const doorPosition = length / 2 - (divider.doorWidth || 30) / 2;

  const getStrokeColor = () => {
    if (isSelected) return 'hsl(var(--primary))';
    return divider.color;
  };

  const getStrokeWidth = () => {
    if (isSelected) return thickness + 2;
    return thickness;
  };

  const getLineCap = () => {
    switch (divider.type) {
      case 'wall':
        return 'butt';
      case 'column':
        return 'round';
      default:
        return 'round';
    }
  };

  return (
    <Group
      x={x1}
      y={y1}
      rotation={angle}
      onClick={onSelect}
      onTap={onSelect}
    >
      {/* Main divider line */}
      {!divider.isDoor ? (
        <Line
          points={[0, 0, length, 0]}
          stroke={getStrokeColor()}
          strokeWidth={getStrokeWidth()}
          lineCap={getLineCap()}
          opacity={divider.type === 'divider' ? 0.8 : 1}
        />
      ) : (
        // Draw door with opening
        <>
          {/* First part of wall */}
          {doorPosition > 0 && (
            <Line
              points={[0, 0, doorPosition, 0]}
              stroke={getStrokeColor()}
              strokeWidth={getStrokeWidth()}
              lineCap={getLineCap()}
            />
          )}

          {/* Second part of wall */}
          {doorPosition + (divider.doorWidth || 30) < length && (
            <Line
              points={[doorPosition + (divider.doorWidth || 30), 0, length, 0]}
              stroke={getStrokeColor()}
              strokeWidth={getStrokeWidth()}
              lineCap={getLineCap()}
            />
          )}

          {/* Door opening indicators */}
          <Line
            points={[doorPosition, -5, doorPosition, 5]}
            stroke={getStrokeColor()}
            strokeWidth={1}
          />
          <Line
            points={[doorPosition + (divider.doorWidth || 30), -5, doorPosition + (divider.doorWidth || 30), 5]}
            stroke={getStrokeColor()}
            strokeWidth={1}
          />
        </>
      )}

      {/* Special styling for different types */}
      {divider.type === 'column' && (
        <Rect
          x={-thickness/2}
          y={-thickness/2}
          width={thickness}
          height={thickness}
          fill={divider.color}
          cornerRadius={thickness/2}
        />
      )}

      {/* Label */}
      {divider.label && (
        <Text
          x={length / 2}
          y={-20}
          text={divider.label}
          fontSize={12}
          fontFamily="Inter, system-ui, sans-serif"
          fill={divider.color}
          align="center"
          offsetX={0}
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <>
          {/* Start point */}
          <Rect
            x={-4}
            y={-4}
            width={8}
            height={8}
            fill="hsl(var(--primary))"
            cornerRadius={4}
          />
          {/* End point */}
          <Rect
            x={length - 4}
            y={-4}
            width={8}
            height={8}
            fill="hsl(var(--primary))"
            cornerRadius={4}
          />
        </>
      )}
    </Group>
  );
};