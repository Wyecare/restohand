import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { FloorPlanSection } from '@/store/api/floorPlansApi';

interface SectionShapeProps {
  section: FloorPlanSection;
  isSelected?: boolean;
  onSelect?: () => void;
  scale?: number;
}

export const SectionShape: React.FC<SectionShapeProps> = ({
  section,
  isSelected = false,
  onSelect,
  scale = 1,
}) => {
  const getDashArray = () => {
    switch (section.borderStyle) {
      case 'dashed':
        return [10, 10];
      case 'dotted':
        return [3, 3];
      default:
        return [];
    }
  };

  return (
    <Group
      x={section.x * scale}
      y={section.y * scale}
      onClick={onSelect}
      onTap={onSelect}
    >
      {/* Section Background */}
      <Rect
        width={section.width * scale}
        height={section.height * scale}
        fill={section.backgroundColor}
        opacity={section.opacity}
        stroke={isSelected ? 'hsl(var(--primary))' : section.borderColor}
        strokeWidth={isSelected ? 3 : section.borderWidth}
        dash={getDashArray()}
        cornerRadius={4}
      />

      {/* Section Label */}
      {section.showLabel && (
        <Text
          x={10}
          y={10}
          text={section.name}
          fontSize={Math.max(12, section.labelSize * scale)}
          fontFamily="Inter, system-ui, sans-serif"
          fill={section.labelColor}
          fontStyle="bold"
          wrap="none"
        />
      )}

      {/* Section Type Badge */}
      <Rect
        x={(section.width * scale) - 80}
        y={5}
        width={75}
        height={20}
        fill="rgba(0, 0, 0, 0.1)"
        cornerRadius={10}
      />
      <Text
        x={(section.width * scale) - 77}
        y={9}
        text={section.sectionType.toUpperCase()}
        fontSize={10}
        fontFamily="Inter, system-ui, sans-serif"
        fill={section.labelColor}
        fontStyle="bold"
      />
    </Group>
  );
};