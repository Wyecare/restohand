import React from 'react';
import { Rect, Circle, Text, Group, Transformer } from 'react-konva';
import { Table } from '../types';
import { getStatusColor } from '../utils/floorPlanHelpers';

interface TableShapeProps {
  table: Table;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (e: any) => void;
}

export const TableShape: React.FC<TableShapeProps> = ({
  table,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}) => {
  const shapeRef = React.useRef<any>(null);
  const transformerRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const color = table.color || getStatusColor(table.status);

  return (
    <>
      <Group
        draggable
        x={table.x}
        y={table.y}
        rotation={table.rotation}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        {table.shape === 'circle' ? (
          <Circle
            ref={shapeRef}
            radius={table.width / 2}
            fill={color}
            stroke={isSelected ? '#3b82f6' : '#64748b'}
            strokeWidth={isSelected ? 3 : 1}
            shadowBlur={isSelected ? 10 : 5}
            shadowOpacity={0.3}
          />
        ) : (
          <Rect
            ref={shapeRef}
            width={table.width}
            height={table.height}
            offsetX={table.width / 2}
            offsetY={table.height / 2}
            fill={color}
            stroke={isSelected ? '#3b82f6' : '#64748b'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={table.shape === 'square' ? 8 : 0}
            shadowBlur={isSelected ? 10 : 5}
            shadowOpacity={0.3}
          />
        )}
        <Text
          text={table.label}
          fontSize={16}
          fontFamily="Arial"
          fill="#ffffff"
          fontStyle="bold"
          align="center"
          verticalAlign="middle"
          width={table.width}
          height={table.height}
          offsetX={table.width / 2}
          offsetY={table.height / 2}
        />
      </Group>
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
            // Limit resize
            if (newBox.width < 40 || newBox.height < 40) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};
