import React, { useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Text, Line } from 'react-konva';
import Konva from 'konva';
import { Edit3, Save, RotateCw, Square, Circle, Minus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { SimpleTableShape } from './SimpleTableShape';
import type { EnhancedRestaurantTable } from '@/store/api/types';

interface FloorPlanEditorProps {
  tables: EnhancedRestaurantTable[];
  onTableUpdate: (tableId: string, updates: {
    layoutX?: number;
    layoutY?: number;
    layoutWidth?: number;
    layoutHeight?: number;
    layoutRotation?: number;
  }) => Promise<void>;
}

interface TableLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isDirty: boolean;
}

export const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({
  tables,
  onTableUpdate,
}) => {
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const [isEditing, setIsEditing] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Track table layouts with dirty flag
  const [tableLayouts, setTableLayouts] = useState<Record<string, TableLayout>>(() => {
    const layouts: Record<string, TableLayout> = {};
    tables.forEach((table, index) => {
      layouts[table.id] = {
        id: table.id,
        x: table.layoutX ?? 200 + (index % 4) * 120,
        y: table.layoutY ?? 150 + Math.floor(index / 4) * 100,
        width: table.layoutWidth || 80,
        height: table.layoutHeight || 80,
        rotation: table.layoutRotation || 0,
        isDirty: false,
      };
    });
    return layouts;
  });

  const selectedTable = selectedTableId ? tables.find(t => t.id === selectedTableId) : null;
  const selectedLayout = selectedTableId ? tableLayouts[selectedTableId] : null;

  const dirtyTables = useMemo(() => {
    return Object.values(tableLayouts).filter(layout => layout.isDirty);
  }, [tableLayouts]);

  const entranceTextColor = useMemo(() => {
    return isDarkMode ? '#FFFFFF' : '#000000';
  }, [isDarkMode]);

  const updateTableLayout = useCallback((tableId: string, updates: Partial<TableLayout>) => {
    setTableLayouts(prev => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        ...updates,
        isDirty: true,
      }
    }));
  }, []);

  const handleTableDragEnd = useCallback((tableId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const x = e.target.x();
    const y = e.target.y();

    updateTableLayout(tableId, { x, y });
  }, [updateTableLayout]);

  const handleTableSelect = useCallback((tableId: string) => {
    setSelectedTableId(tableId);
  }, []);

  const handleRotateTable = () => {
    if (!selectedTableId || !selectedLayout) return;

    const newRotation = (selectedLayout.rotation + 45) % 360;
    updateTableLayout(selectedTableId, { rotation: newRotation });
  };

  const handleResizeTable = (dimension: 'width' | 'height', value: number) => {
    if (!selectedTableId || value < 40 || value > 200) return;

    updateTableLayout(selectedTableId, { [dimension]: value });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);

    try {
      // Save all dirty tables
      await Promise.all(
        dirtyTables.map(layout =>
          onTableUpdate(layout.id, {
            layoutX: layout.x,
            layoutY: layout.y,
            layoutWidth: layout.width,
            layoutHeight: layout.height,
            layoutRotation: layout.rotation,
          })
        )
      );

      // Mark all tables as clean
      setTableLayouts(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          updated[id] = { ...updated[id], isDirty: false };
        });
        return updated;
      });

      toast({
        title: 'Floor Plan Saved',
        description: `Updated ${dirtyTables.length} table${dirtyTables.length !== 1 ? 's' : ''}`,
      });

    } catch (error) {
      toast({
        title: 'Failed to Save Floor Plan',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    // Reset all dirty tables to their original positions
    setTableLayouts(prev => {
      const updated = { ...prev };
      tables.forEach((table, index) => {
        updated[table.id] = {
          id: table.id,
          x: table.layoutX ?? 200 + (index % 4) * 120,
          y: table.layoutY ?? 150 + Math.floor(index / 4) * 100,
          width: table.layoutWidth || 80,
          height: table.layoutHeight || 80,
          rotation: table.layoutRotation || 0,
          isDirty: false,
        };
      });
      return updated;
    });
    setSelectedTableId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Floor Plan Editor
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isEditing ? 'Drag tables to reposition. Click to select and modify.' : 'Click "Edit Layout" to modify table positions.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirtyTables.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                {dirtyTables.length} unsaved
              </Badge>
            )}

            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Layout
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    handleDiscardChanges();
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={dirtyTables.length === 0 || isSaving}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Layout
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* Main Floor Plan Canvas */}
          <div className="flex-1">
            <div
              className="border rounded-lg bg-muted/10 overflow-auto relative"
              style={{ height: '600px' }}
            >
              <Stage width={1000} height={600}>
                <Layer>
                  {/* Entrance text */}
                  <Text
                    text="ENTRANCE"
                    x={450}
                    y={570}
                    fontSize={16}
                    fontFamily="Inter, system-ui, sans-serif"
                    fill={entranceTextColor}
                    align="center"
                    width={100}
                  />

                  {/* Grid lines for better visual guidance */}
                  {isEditing && (
                    <>
                      {Array.from({ length: 20 }, (_, i) => (
                        <React.Fragment key={`grid-v-${i}`}>
                          {/* Vertical lines */}
                          <Line
                            points={[i * 50, 0, i * 50, 600]}
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                            strokeWidth={0.5}
                            opacity={0.3}
                          />
                        </React.Fragment>
                      ))}
                      {Array.from({ length: 20 }, (_, i) => (
                        <React.Fragment key={`grid-h-${i}`}>
                          {/* Horizontal lines */}
                          <Line
                            points={[0, i * 30, 1000, i * 30]}
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                            strokeWidth={0.5}
                            opacity={0.3}
                          />
                        </React.Fragment>
                      ))}
                    </>
                  )}

                  {/* Tables */}
                  {Object.values(tableLayouts).map((layout) => {
                    const table = tables.find(t => t.id === layout.id);
                    if (!table) return null;

                    return (
                      <SimpleTableShape
                        key={table.id}
                        table={{
                          id: table.id,
                          x: layout.x,
                          y: layout.y,
                          width: layout.width,
                          height: layout.height,
                          rotation: layout.rotation,
                          shape: 'rectangle',
                          label: table.tableNumber,
                          capacity: table.capacity || 4,
                          zone: table.zone,
                          color: layout.isDirty ? '#f97316' : '#22c55e', // Orange for dirty, green for clean
                        }}
                        status={table.currentStatus}
                        isSelected={selectedTableId === table.id}
                        onSelect={() => handleTableSelect(table.id)}
                        onDragEnd={(e) => handleTableDragEnd(table.id, e)}
                        scale={1}
                        isDraggable={isEditing}
                        showStatusIndicators={!isEditing}
                      />
                    );
                  })}
                </Layer>
              </Stage>
            </div>
          </div>

          {/* Properties Panel */}
          {isEditing && (
            <div className="w-80 space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm">Table Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTable && selectedLayout ? (
                    <>
                      <div>
                        <Label className="text-xs font-medium">Table {selectedTable.tableNumber}</Label>
                        <p className="text-xs text-muted-foreground">
                          {selectedTable.capacity} seats • {selectedTable.zone || 'No zone'}
                        </p>
                      </div>

                      {/* Position */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">X Position</Label>
                          <Input
                            type="number"
                            value={Math.round(selectedLayout.x)}
                            onChange={(e) => updateTableLayout(selectedTableId!, { x: parseInt(e.target.value) || 0 })}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y Position</Label>
                          <Input
                            type="number"
                            value={Math.round(selectedLayout.y)}
                            onChange={(e) => updateTableLayout(selectedTableId!, { y: parseInt(e.target.value) || 0 })}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      {/* Size */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            min="40"
                            max="200"
                            value={selectedLayout.width}
                            onChange={(e) => handleResizeTable('width', parseInt(e.target.value) || 80)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Height</Label>
                          <Input
                            type="number"
                            min="40"
                            max="200"
                            value={selectedLayout.height}
                            onChange={(e) => handleResizeTable('height', parseInt(e.target.value) || 80)}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      {/* Rotation */}
                      <div>
                        <Label className="text-xs">Rotation</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="359"
                            value={selectedLayout.rotation}
                            onChange={(e) => updateTableLayout(selectedTableId!, { rotation: parseInt(e.target.value) || 0 })}
                            className="flex-1 text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRotateTable}
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="pt-2 border-t">
                        <Label className="text-xs font-medium mb-2 block">Quick Actions</Label>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateTableLayout(selectedTableId!, { width: 80, height: 80 })}
                            className="text-xs"
                          >
                            <Square className="h-3 w-3 mr-1" />
                            Square
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateTableLayout(selectedTableId!, { width: 120, height: 60 })}
                            className="text-xs"
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            Rectangle
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Click a table to edit its properties</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Legend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs">Legend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Clean (saved)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>Modified (unsaved)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};