import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { FloorPlanDecoration } from '@/store/api/floorPlansApi';

interface DecorationShapeProps {
  decoration: FloorPlanDecoration;
  isSelected?: boolean;
  onSelect?: () => void;
  scale?: number;
}

export const DecorationShape: React.FC<DecorationShapeProps> = ({
  decoration,
  isSelected = false,
  onSelect,
  scale = 1,
}) => {
  const getDecorationIcon = () => {
    const width = decoration.width * scale;
    const height = decoration.height * scale;

    switch (decoration.type) {
      case 'plant':
        return (
          <Circle
            x={width / 2}
            y={height / 2}
            radius={Math.min(width, height) / 2 - 2}
            fill={decoration.color}
            stroke={isSelected ? 'hsl(var(--primary))' : decoration.color}
            strokeWidth={isSelected ? 3 : 1}
          />
        );

      case 'artwork':
        return (
          <Rect
            width={width}
            height={height}
            fill={decoration.color}
            stroke={isSelected ? 'hsl(var(--primary))' : decoration.color}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={4}
          />
        );

      case 'fixture':
        return (
          <Circle
            x={width / 2}
            y={height / 2}
            radius={Math.min(width, height) / 2 - 2}
            fill={decoration.color}
            stroke={isSelected ? 'hsl(var(--primary))' : '#000000'}
            strokeWidth={isSelected ? 3 : 2}
          />
        );

      case 'entrance':
        return (
          <Rect
            width={width}
            height={height}
            fill="transparent"
            stroke={isSelected ? 'hsl(var(--primary))' : decoration.color}
            strokeWidth={isSelected ? 4 : 3}
            dash={[10, 5]}
            cornerRadius={4}
          />
        );

      case 'kitchen-door':
        return (
          <Rect
            width={width}
            height={height}
            fill={decoration.color}
            stroke={isSelected ? 'hsl(var(--primary))' : '#000000'}
            strokeWidth={isSelected ? 3 : 2}
            cornerRadius={2}
          />
        );

      case 'bathroom':
        return (
          <Circle
            x={width / 2}
            y={height / 2}
            radius={Math.min(width, height) / 2 - 2}
            fill={decoration.color}
            stroke={isSelected ? 'hsl(var(--primary))' : '#000000'}
            strokeWidth={isSelected ? 3 : 2}
          />
        );

      case 'cashier':
        return (
          <Rect
            width={width}
            height={height}
            fill={decoration.color}
            stroke={isSelected ? 'hsl(var(--primary))' : '#000000'}
            strokeWidth={isSelected ? 3 : 2}
            cornerRadius={6}
          />
        );

      default:
        return (
          <Rect
            width={width}
            height={height}
            fill={decoration.color}
            stroke={isSelected ? 'hsl(var(--primary))' : decoration.color}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={4}
          />
        );
    }
  };

  const getDecorationText = () => {
    switch (decoration.type) {
      case 'plant':
        return '🌿';
      case 'artwork':
        return '🖼️';
      case 'fixture':
        return '💡';
      case 'entrance':
        return '🚪';
      case 'kitchen-door':
        return '👨‍🍳';
      case 'bathroom':
        return '🚽';
      case 'cashier':
        return '💳';
      default:
        return '📍';
    }
  };

  return (
    <Group
      x={decoration.x * scale}
      y={decoration.y * scale}
      rotation={decoration.rotation}
      onClick={onSelect}
      onTap={onSelect}
    >
      {/* Decoration Shape */}
      {getDecorationIcon()}

      {/* Icon/Emoji */}
      <Text
        x={decoration.width * scale / 2}
        y={decoration.height * scale / 2}
        text={decoration.icon || getDecorationText()}
        fontSize={Math.min(decoration.width * scale, decoration.height * scale) * 0.4}
        fontFamily="system-ui, sans-serif"
        fill="#000000"
        align="center"
        verticalAlign="middle"
        offsetX={(decoration.width * scale / 2) * 0.1}
        offsetY={(decoration.height * scale / 2) * 0.1}
      />

      {/* Label */}
      {decoration.label && (
        <Text
          x={decoration.width * scale / 2}
          y={decoration.height * scale + 15}
          text={decoration.label}
          fontSize={10}
          fontFamily="Inter, system-ui, sans-serif"
          fill={decoration.color}
          align="center"
          offsetX={0}
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <>
          <Rect
            x={-4}
            y={-4}
            width={8}
            height={8}
            fill="hsl(var(--primary))"
            cornerRadius={4}
          />
          <Rect
            x={decoration.width * scale - 4}
            y={-4}
            width={8}
            height={8}
            fill="hsl(var(--primary))"
            cornerRadius={4}
          />
          <Rect
            x={-4}
            y={decoration.height * scale - 4}
            width={8}
            height={8}
            fill="hsl(var(--primary))"
            cornerRadius={4}
          />
          <Rect
            x={decoration.width * scale - 4}
            y={decoration.height * scale - 4}
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