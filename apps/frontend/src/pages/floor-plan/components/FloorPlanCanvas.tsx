import React from 'react';
import { Stage, Layer } from 'react-konva';
import { Table } from '../types';
import { TableShape } from './TableShape';

interface FloorPlanCanvasProps {
  tables: Table[];
  canvasSize: { width: number; height: number };
  selectedTableId: string | null;
  onTableSelect: (id: string) => void;
  onTableUpdate: (id: string, updates: Partial<Table>) => void;
  onCanvasClick: () => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  tables,
  canvasSize,
  selectedTableId,
  onTableSelect,
  onTableUpdate,
  onCanvasClick,
}) => {
  const handleDragEnd = (tableId: string, e: any) => {
    onTableUpdate(tableId, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = (tableId: string, e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    onTableUpdate(tableId, {
      x: node.x(),
      y: node.y(),
      width: Math.max(40, node.width() * scaleX),
      height: Math.max(40, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg bg-gray-50">
      <Stage
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={(e) => {
          // Click on empty area - deselect
          if (e.target === e.target.getStage()) {
            onCanvasClick();
          }
        }}
      >
        <Layer>
          {tables.map((table) => (
            <TableShape
              key={table.id}
              table={table}
              isSelected={table.id === selectedTableId}
              onSelect={() => onTableSelect(table.id)}
              onDragEnd={(e) => handleDragEnd(table.id, e)}
              onTransformEnd={(e) => handleTransformEnd(table.id, e)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
