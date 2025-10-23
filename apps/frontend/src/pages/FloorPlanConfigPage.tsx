import React, { useState, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import {
  useGetFloorPlansQuery,
  useCreateFloorPlanMutation,
  useUpdateFloorPlanMutation,
  FloorPlan,
  FloorPlanTable,
  CreateFloorPlanRequest,
} from '@/store/api/floorPlansApi';
import { TableShape } from '@/components/floor-plan/TableShape';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/store/hooks';
import { selectAuthSession } from '@/store/slices/authSlice';
import {
  Plus,
  Save,
  Trash2,
  Square,
  Circle,
  RectangleHorizontal,
  Settings2,
  MousePointer,
  Grid3X3,
  Undo2,
  Redo2,
  Download,
  Upload,
  Home,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Konva from 'konva';
import { useNavigate } from 'react-router-dom';
// IMPORT THE SIMPLE TEMPLATE
import { SIMPLE_RESTAURANT_TEMPLATE } from '@/components/floor-plan/templates/simple-template';

interface ConfigTableShape extends FloorPlanTable {
  isSelected?: boolean;
}

type SelectedElementType = 'table';

interface SelectedElement {
  type: SelectedElementType;
  id: string;
}

const FloorPlanConfigPage: React.FC = () => {
  const session = useAppSelector(selectAuthSession);
  const { toast } = useToast();
  const navigate = useNavigate();

  const restaurantId = session?.restaurantId;

  // State
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<string | null>(
    null
  );
  const [selectedElement, setSelectedElement] =
    useState<SelectedElement | null>(null);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(false);

  // Editor state
  const [currentTables, setCurrentTables] = useState<ConfigTableShape[]>([]);
  const [canvasSettings, setCanvasSettings] = useState({
    width: 1000,
    height: 700,
    showGrid: true,
    gridSize: 2,
    zoom: 1,
  });

  // Tool state
  const [selectedTool, setSelectedTool] = useState<'select' | 'add-table'>(
    'select'
  );
  const [newTableShape, setNewTableShape] = useState<
    'rectangle' | 'circle' | 'square'
  >('rectangle');

  // Form state
  const [floorPlanForm, setFloorPlanForm] = useState({
    name: 'New Floor Plan',
    description: '',
    isActive: false,
  });

  // API hooks
  const {
    data: floorPlansData,
    isLoading: floorPlansLoading,
    refetch: refetchFloorPlans,
  } = useGetFloorPlansQuery(
    { restaurantId: restaurantId! },
    { skip: !restaurantId }
  );

  const [createFloorPlan, { isLoading: isCreating }] =
    useCreateFloorPlanMutation();
  const [updateFloorPlan, { isLoading: isUpdating }] =
    useUpdateFloorPlanMutation();

  // Load template function
  const handleLoadTemplate = useCallback(() => {
    // Load tables from template
    const templatedTables: ConfigTableShape[] =
      SIMPLE_RESTAURANT_TEMPLATE.tables.map((table) => ({
        ...table,
        isSelected: false,
      }));

    setCurrentTables(templatedTables);

    // Update canvas settings from template
    setCanvasSettings({
      width: SIMPLE_RESTAURANT_TEMPLATE.metadata.canvasWidth,
      height: SIMPLE_RESTAURANT_TEMPLATE.metadata.canvasHeight,
      showGrid: SIMPLE_RESTAURANT_TEMPLATE.metadata.showGrid || true,
      gridSize: SIMPLE_RESTAURANT_TEMPLATE.metadata.gridSize || 2,
      zoom: SIMPLE_RESTAURANT_TEMPLATE.metadata.zoomLevel || 1,
    });

    // Update form with template name and description
    setFloorPlanForm({
      name: SIMPLE_RESTAURANT_TEMPLATE.name,
      description: SIMPLE_RESTAURANT_TEMPLATE.description,
      isActive: false,
    });

    toast({
      title: 'Template Loaded',
      description: `${SIMPLE_RESTAURANT_TEMPLATE.name} has been loaded successfully.`,
    });
  }, [toast]);

  // Handle table drag end
  const handleTableDragEnd = useCallback(
    (tableId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const newX = e.target.x();
      const newY = e.target.y();

      setCurrentTables((prev) =>
        prev.map((table) =>
          table.id === tableId ? { ...table, x: newX, y: newY } : table
        )
      );
    },
    []
  );

  // Handle table transform end (resize/rotate)
  const handleTableTransformEnd = useCallback(
    (tableId: string, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Reset scale
      node.scaleX(1);
      node.scaleY(1);

      setCurrentTables((prev) =>
        prev.map((table) =>
          table.id === tableId
            ? {
                ...table,
                x: node.x(),
                y: node.y(),
                width: Math.max(60, node.width() * scaleX),
                height: Math.max(60, node.height() * scaleY),
                rotation: node.rotation(),
              }
            : table
        )
      );
    },
    []
  );

  // Create new table
  const createNewTable = useCallback(
    (x: number, y: number) => {
      const newTable: ConfigTableShape = {
        id: `table-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        x,
        y,
        width: newTableShape === 'circle' ? 100 : 120,
        height: newTableShape === 'circle' ? 100 : 80,
        rotation: 0,
        shape: newTableShape,
        label: `T${currentTables.length + 1}`,
        capacity: 4,
        zone: 'Main',
        isSelected: false,
      };

      setCurrentTables((prev) => [...prev, newTable]);
      setSelectedTool('select');
    },
    [newTableShape, currentTables.length]
  );

  // Handle element selection
  const handleElementSelect = useCallback(
    (type: SelectedElementType, id: string) => {
      setSelectedElement({ type, id });

      // Update selection state
      setCurrentTables((prev) =>
        prev.map((table) => ({
          ...table,
          isSelected: table.id === id,
        }))
      );

      setIsPropertiesPanelOpen(true);
    },
    []
  );

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Check if clicking on empty canvas
      if (e.target === e.target.getStage()) {
        const pos = e.target.getStage()?.getPointerPosition();

        // Handle tool actions
        if (selectedTool === 'add-table' && pos) {
          createNewTable(pos.x, pos.y);
        } else {
          // Deselect when clicking empty space
          setSelectedElement(null);
          setCurrentTables((prev) =>
            prev.map((table) => ({ ...table, isSelected: false }))
          );
          setIsPropertiesPanelOpen(false);
        }
      }
    },
    [selectedTool, createNewTable]
  );

  // Handle table property updates
  const handleTableUpdate = useCallback(
    (tableId: string, updates: Partial<ConfigTableShape>) => {
      setCurrentTables((prev) =>
        prev.map((table) =>
          table.id === tableId ? { ...table, ...updates } : table
        )
      );
    },
    []
  );

  // Delete selected element
  const handleDeleteElement = useCallback(() => {
    if (selectedElement) {
      if (selectedElement.type === 'table') {
        setCurrentTables((prev) =>
          prev.filter((table) => table.id !== selectedElement.id)
        );
      }
      setSelectedElement(null);
      setIsPropertiesPanelOpen(false);
    }
  }, [selectedElement]);

  // Clear canvas
  const handleClearCanvas = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all tables?')) {
      setCurrentTables([]);
      setSelectedElement(null);
      setIsPropertiesPanelOpen(false);
      toast({
        title: 'Canvas Cleared',
        description: 'All tables have been removed.',
      });
    }
  }, [toast]);

  // Save floor plan
  const handleSave = useCallback(async () => {
    if (!restaurantId || !floorPlanForm.name) return;

    try {
      const floorPlanData: CreateFloorPlanRequest = {
        name: floorPlanForm.name,
        description: floorPlanForm.description,
        isActive: floorPlanForm.isActive,
        tables: currentTables.map(({ isSelected, ...table }) => table),
        metadata: {
          canvasWidth: canvasSettings.width,
          canvasHeight: canvasSettings.height,
          backgroundColor: 'hsl(var(--background))',
          gridSize: canvasSettings.gridSize,
          showGrid: canvasSettings.showGrid,
          zoomLevel: canvasSettings.zoom,
        },
      };

      if (selectedFloorPlan) {
        await updateFloorPlan({
          id: selectedFloorPlan,
          restaurantId,
          data: floorPlanData,
        }).unwrap();

        toast({
          title: 'Success',
          description: 'Floor plan updated successfully',
        });
      } else {
        await createFloorPlan({ restaurantId, data: floorPlanData }).unwrap();

        toast({
          title: 'Success',
          description: 'Floor plan created successfully',
        });
      }

      refetchFloorPlans();
    } catch (error) {
      console.error('Failed to save floor plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to save floor plan',
        variant: 'destructive',
      });
    }
  }, [
    restaurantId,
    floorPlanForm,
    currentTables,
    canvasSettings,
    selectedFloorPlan,
    createFloorPlan,
    updateFloorPlan,
    toast,
    refetchFloorPlans,
  ]);

  const selectedTable =
    selectedElement?.type === 'table'
      ? currentTables.find((t) => t.id === selectedElement.id)
      : null;

  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertDescription>
            Please complete your restaurant setup to access floor plan
            configuration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-lg font-semibold">Floor Plan Designer</h1>
            <p className="text-xs text-muted-foreground">
              Create and customize your restaurant layout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Floor Plan Name"
            value={floorPlanForm.name}
            onChange={(e) =>
              setFloorPlanForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-64 h-9"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/30">
        <div className="flex items-center gap-2">
          {/* Tool Selection */}
          <ToggleGroup
            type="single"
            value={selectedTool}
            onValueChange={(value) => value && setSelectedTool(value as 'select' | 'add-table')}
          >
            <ToggleGroupItem value="select" size="sm">
              <MousePointer className="w-4 h-4 mr-2" />
              Select
            </ToggleGroupItem>
            <ToggleGroupItem value="add-table" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Table
            </ToggleGroupItem>
          </ToggleGroup>

          {selectedTool === 'add-table' && (
            <>
              <Separator orientation="vertical" className="h-6 mx-2" />
              <ToggleGroup
                type="single"
                value={newTableShape}
                onValueChange={(value) =>
                  value && setNewTableShape(value as 'rectangle' | 'circle' | 'square')
                }
              >
                <ToggleGroupItem value="rectangle" size="sm">
                  <RectangleHorizontal className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="square" size="sm">
                  <Square className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="circle" size="sm">
                  <Circle className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </>
          )}

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Quick Actions */}
          <Button variant="outline" size="sm" onClick={handleLoadTemplate}>
            <File className="w-4 h-4 mr-2" />
            Load Template
          </Button>

          <Button variant="outline" size="sm" onClick={handleClearCanvas}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCanvasSettings((prev) => ({
                ...prev,
                showGrid: !prev.showGrid,
              }))
            }
            className={cn(canvasSettings.showGrid && 'bg-accent')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPropertiesPanelOpen(!isPropertiesPanelOpen)}
            className={cn(isPropertiesPanelOpen && 'bg-accent')}
          >
            <Settings2 className="w-4 h-4" />
          </Button>

          {selectedElement && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteElement}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-muted/20">
          <div className="p-6" style={{ minWidth: canvasSettings.width + 100, minHeight: canvasSettings.height + 100 }}>
            <div className="border border-border/50 rounded-lg bg-background shadow-lg overflow-hidden mx-auto" style={{ width: canvasSettings.width, height: canvasSettings.height }}>
              <Stage
                width={canvasSettings.width}
                height={canvasSettings.height}
                onClick={handleCanvasClick}
              >
                <Layer>
                  {/* Grid */}
                  {canvasSettings.showGrid && (
                    <>
                      {Array.from(
                        {
                          length:
                            Math.ceil(
                              canvasSettings.width / canvasSettings.gridSize
                            ) + 1,
                        },
                        (_, i) => (
                          <Line
                            key={`v-${i}`}
                            points={[
                              i * canvasSettings.gridSize,
                              0,
                              i * canvasSettings.gridSize,
                              canvasSettings.height,
                            ]}
                            stroke="hsl(var(--border))"
                            strokeWidth={1}
                            opacity={0.3}
                            listening={false}
                          />
                        )
                      )}
                      {Array.from(
                        {
                          length:
                            Math.ceil(
                              canvasSettings.height / canvasSettings.gridSize
                            ) + 1,
                        },
                        (_, i) => (
                          <Line
                            key={`h-${i}`}
                            points={[
                              0,
                              i * canvasSettings.gridSize,
                              canvasSettings.width,
                              i * canvasSettings.gridSize,
                            ]}
                            stroke="hsl(var(--border))"
                            strokeWidth={1}
                            opacity={0.3}
                            listening={false}
                          />
                        )
                      )}
                    </>
                  )}

                  {/* Tables */}
                  {currentTables.map((table) => (
                    <TableShape
                      key={table.id}
                      table={table}
                      isSelected={table.isSelected || false}
                      color={table.color || 'hsl(var(--muted) / 0.5)'}
                      onSelect={() => handleElementSelect('table', table.id)}
                      onDragEnd={(e) => handleTableDragEnd(table.id, e)}
                      onTransformEnd={(e) =>
                        handleTableTransformEnd(table.id, e)
                      }
                      scale={canvasSettings.zoom}
                      isDraggable={selectedTool === 'select'}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        {isPropertiesPanelOpen && selectedElement && (
          <div className="w-80 lg:w-80 md:w-72 sm:w-64 border-l bg-card/50 backdrop-blur-sm flex flex-col">
            <div className="p-4 border-b bg-card/30">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Table Properties</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPropertiesPanelOpen(false)}
                >
                  ×
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {selectedTable && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Label</Label>
                      <Input
                        value={selectedTable.label}
                        onChange={(e) =>
                          handleTableUpdate(selectedTable.id, {
                            label: e.target.value,
                          })
                        }
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Capacity</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={selectedTable.capacity}
                        onChange={(e) =>
                          handleTableUpdate(selectedTable.id, {
                            capacity: parseInt(e.target.value) || 4,
                          })
                        }
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Shape</Label>
                      <Select
                        value={selectedTable.shape}
                        onValueChange={(value) =>
                          handleTableUpdate(selectedTable.id, {
                            shape: value as 'rectangle' | 'circle' | 'square',
                          })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rectangle">Rectangle</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Width</Label>
                        <Input
                          type="number"
                          min="60"
                          max="300"
                          value={Math.round(selectedTable.width)}
                          onChange={(e) =>
                            handleTableUpdate(selectedTable.id, {
                              width: parseInt(e.target.value) || 80,
                            })
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Height</Label>
                        <Input
                          type="number"
                          min="60"
                          max="300"
                          value={Math.round(selectedTable.height)}
                          onChange={(e) =>
                            handleTableUpdate(selectedTable.id, {
                              height: parseInt(e.target.value) || 80,
                            })
                          }
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Zone</Label>
                      <Input
                        value={selectedTable.zone || ''}
                        onChange={(e) =>
                          handleTableUpdate(selectedTable.id, {
                            zone: e.target.value,
                          })
                        }
                        className="h-9"
                        placeholder="e.g., Main, VIP, Patio"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Position</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            X
                          </Label>
                          <Input
                            type="number"
                            value={Math.round(selectedTable.x)}
                            onChange={(e) =>
                              handleTableUpdate(selectedTable.id, {
                                x: parseInt(e.target.value) || 0,
                              })
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Y
                          </Label>
                          <Input
                            type="number"
                            value={Math.round(selectedTable.y)}
                            onChange={(e) =>
                              handleTableUpdate(selectedTable.id, {
                                y: parseInt(e.target.value) || 0,
                              })
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-card/30 backdrop-blur-sm text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{currentTables.length} tables</span>
          <span>
            Canvas: {canvasSettings.width} × {canvasSettings.height}
          </span>
          {selectedTool === 'add-table' && (
            <span className="text-primary">Click on canvas to add table</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Zoom: {Math.round(canvasSettings.zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanConfigPage;
