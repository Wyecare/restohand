import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  useGetFloorPlansQuery,
  useGetActiveFloorPlanQuery,
  useCreateFloorPlanMutation,
  useUpdateFloorPlanMutation,
  useSetActiveFloorPlanMutation,
  useDeleteFloorPlanMutation,
  FloorPlan,
  FloorPlanTable,
  FloorPlanSection,
  FloorPlanDivider,
  FloorPlanDecoration,
  CreateFloorPlanRequest,
} from '@/store/api/floorPlansApi';
import { TableShape } from '@/components/floor-plan/TableShape';
import { SectionShape } from '@/components/floor-plan/SectionShape';
import { DividerShape } from '@/components/floor-plan/DividerShape';
import { DecorationShape } from '@/components/floor-plan/DecorationShape';
import { CLASSIC_RESTAURANT_TEMPLATE } from '@/components/floor-plan/templates/classic-template';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/store/hooks';
import { selectAuthSession } from '@/store/slices/authSlice';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Plus,
  Save,
  Download,
  Trash2,
  Grid,
  Move,
  Square,
  Circle,
  RectangleHorizontal,
  Home,
  Coffee,
  Star,
  Settings2,
  MousePointer,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Konva from 'konva';

interface ConfigTableShape extends FloorPlanTable {
  isSelected?: boolean;
}

interface ConfigSectionShape extends FloorPlanSection {
  isSelected?: boolean;
}

interface ConfigDividerShape extends FloorPlanDivider {
  isSelected?: boolean;
}

interface ConfigDecorationShape extends FloorPlanDecoration {
  isSelected?: boolean;
}

type SelectedElementType = 'table' | 'section' | 'divider' | 'decoration';

interface SelectedElement {
  type: SelectedElementType;
  id: string;
}

const FloorPlanConfigPage: React.FC = () => {
  const session = useAppSelector(selectAuthSession);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const restaurantId = session?.restaurantId;

  // State
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(false);

  // Editor state
  const [currentTables, setCurrentTables] = useState<ConfigTableShape[]>([]);
  const [currentSections, setCurrentSections] = useState<ConfigSectionShape[]>([]);
  const [currentDividers, setCurrentDividers] = useState<ConfigDividerShape[]>([]);
  const [currentDecorations, setCurrentDecorations] = useState<ConfigDecorationShape[]>([]);
  const [canvasSettings, setCanvasSettings] = useState({
    width: 1200,
    height: 800,
    backgroundColor: 'hsl(var(--background))',
    showGrid: true,
    gridSize: 20,
    zoom: 1,
  });

  // Tool state
  const [selectedTool, setSelectedTool] = useState<'select' | 'add-table' | 'add-section' | 'add-divider' | 'add-decoration'>('select');
  const [newTableShape, setNewTableShape] = useState<'rectangle' | 'circle' | 'square'>('rectangle');

  const defaultTableColor = useMemo(
    () =>
      resolvedTheme === 'dark'
        ? 'rgba(255, 255, 255, 0.22)'
        : 'rgba(15, 23, 42, 0.12)',
    [resolvedTheme]
  );

  const loadTemplate = useCallback(() => {
    setCurrentTables(
      CLASSIC_RESTAURANT_TEMPLATE.tables.map((table) => ({
        ...table,
        color: table.color ?? defaultTableColor,
        isSelected: false,
      }))
    );
    setCurrentSections(
      CLASSIC_RESTAURANT_TEMPLATE.sections.map((section) => ({
        ...section,
        isSelected: false,
      }))
    );
    setCurrentDividers(
      CLASSIC_RESTAURANT_TEMPLATE.dividers.map((divider) => ({
        ...divider,
        isSelected: false,
      }))
    );
    setCurrentDecorations(
      CLASSIC_RESTAURANT_TEMPLATE.decorations.map((decoration) => ({
        ...decoration,
        isSelected: false,
      }))
    );
    setCanvasSettings({
      width: CLASSIC_RESTAURANT_TEMPLATE.metadata.canvasWidth,
      height: CLASSIC_RESTAURANT_TEMPLATE.metadata.canvasHeight,
      backgroundColor: CLASSIC_RESTAURANT_TEMPLATE.metadata.backgroundColor,
      showGrid: CLASSIC_RESTAURANT_TEMPLATE.metadata.showGrid,
      gridSize: CLASSIC_RESTAURANT_TEMPLATE.metadata.gridSize * 20,
      zoom: CLASSIC_RESTAURANT_TEMPLATE.metadata.zoomLevel,
    });
    setFloorPlanForm({
      name: CLASSIC_RESTAURANT_TEMPLATE.name,
      description: CLASSIC_RESTAURANT_TEMPLATE.description,
      isActive: false,
    });
    setSelectedElement(null);
    setIsPropertiesPanelOpen(false);
  }, [defaultTableColor]);

  // Form state
  const [floorPlanForm, setFloorPlanForm] = useState({
    name: '',
    description: '',
    isActive: false,
  });

  // API hooks
  const {
    data: floorPlansData,
    isLoading: floorPlansLoading,
    refetch: refetchFloorPlans
  } = useGetFloorPlansQuery(
    { restaurantId: restaurantId! },
    { skip: !restaurantId }
  );

  const {
    data: activeFloorPlan,
    refetch: refetchActiveFloorPlan
  } = useGetActiveFloorPlanQuery(
    { restaurantId: restaurantId! },
    { skip: !restaurantId }
  );

  const [createFloorPlan, { isLoading: isCreating }] = useCreateFloorPlanMutation();
  const [updateFloorPlan, { isLoading: isUpdating }] = useUpdateFloorPlanMutation();

  // Handle table drag end
  const handleTableDragEnd = useCallback((tableId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = e.target.x();
    const newY = e.target.y();

    setCurrentTables(prev =>
      prev.map(table =>
        table.id === tableId
          ? { ...table, x: newX, y: newY }
          : table
      )
    );
  }, []);

  // Handle table transform end (resize/rotate)
  const handleTableTransformEnd = useCallback((tableId: string, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    setCurrentTables(prev =>
      prev.map(table =>
        table.id === tableId
          ? {
              ...table,
              x: node.x(),
              y: node.y(),
              width: Math.max(40, node.width() * scaleX),
              height: Math.max(40, node.height() * scaleY),
              rotation: node.rotation(),
            }
          : table
      )
    );
  }, []);

  // Create new table
  const createNewTable = useCallback((x: number, y: number) => {
    const newTable: ConfigTableShape = {
      id: `table-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      x,
      y,
      width: newTableShape === 'circle' ? 80 : 100,
      height: newTableShape === 'circle' ? 80 : 80,
      rotation: 0,
      shape: newTableShape,
      label: `T${currentTables.length + 1}`,
      capacity: 4,
      zone: 'Main',
      color: defaultTableColor,
      isSelected: false,
    };

    setCurrentTables(prev => [...prev, newTable]);
    setSelectedTool('select');
  }, [newTableShape, currentTables.length, defaultTableColor]);

  // Handle element selection
  const handleElementSelect = useCallback((type: SelectedElementType, id: string) => {
    setSelectedElement({ type, id });

    // Update selection state
    if (type === 'table') {
      setCurrentTables(prev =>
        prev.map(table => ({
          ...table,
          isSelected: table.id === id
        }))
      );
    }

    setIsPropertiesPanelOpen(true);
  }, []);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    // Check if clicking on empty canvas
    if (e.target === e.target.getStage()) {
      const pos = e.target.getStage()?.getPointerPosition();

      // Handle tool actions
      if (selectedTool === 'add-table' && pos) {
        createNewTable(pos.x, pos.y);
      } else {
        // Deselect when clicking empty space
        setSelectedElement(null);
        setCurrentTables(prev => prev.map(table => ({ ...table, isSelected: false })));
        setIsPropertiesPanelOpen(false);
      }
    }
  }, [selectedTool, createNewTable]);

  // Handle table property updates
  const handleTableUpdate = useCallback((tableId: string, updates: Partial<ConfigTableShape>) => {
    setCurrentTables(prev =>
      prev.map(table =>
        table.id === tableId ? { ...table, ...updates } : table
      )
    );
  }, []);

  // Delete selected element
  const handleDeleteElement = useCallback(() => {
    if (selectedElement) {
      if (selectedElement.type === 'table') {
        setCurrentTables(prev => prev.filter(table => table.id !== selectedElement.id));
      }
      setSelectedElement(null);
      setIsPropertiesPanelOpen(false);
    }
  }, [selectedElement]);

  // Save floor plan
  const handleSave = useCallback(async () => {
    if (!restaurantId || !floorPlanForm.name) return;

    try {
      const floorPlanData: CreateFloorPlanRequest = {
        name: floorPlanForm.name,
        description: floorPlanForm.description,
        tables: currentTables.map(({ isSelected, ...table }) => table),
        sections: currentSections.map(({ isSelected, ...section }) => section),
        dividers: currentDividers.map(({ isSelected, ...divider }) => divider),
        decorations: currentDecorations.map(({ isSelected, ...decoration }) => decoration),
        metadata: {
          canvasWidth: canvasSettings.width,
          canvasHeight: canvasSettings.height,
          backgroundColor: canvasSettings.backgroundColor,
          gridSize: canvasSettings.gridSize / 20,
          showGrid: canvasSettings.showGrid,
          zoomLevel: canvasSettings.zoom,
        },
        isActive: floorPlanForm.isActive,
      };

      if (selectedFloorPlan) {
        await updateFloorPlan({
          restaurantId,
          id: selectedFloorPlan,
          data: floorPlanData,
        }).unwrap();
      } else {
        await createFloorPlan({
          restaurantId,
          data: floorPlanData,
        }).unwrap();
      }

      toast({
        title: 'Success',
        description: `Floor plan ${selectedFloorPlan ? 'updated' : 'created'} successfully.`,
      });

      refetchFloorPlans();
      refetchActiveFloorPlan();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save floor plan. Please try again.',
        variant: 'destructive',
      });
    }
  }, [
    restaurantId,
    floorPlanForm,
    currentTables,
    currentSections,
    currentDividers,
    currentDecorations,
    canvasSettings,
    selectedFloorPlan,
    updateFloorPlan,
    createFloorPlan,
    toast,
    refetchFloorPlans,
    refetchActiveFloorPlan,
  ]);

  // Load floor plan for editing
  const loadFloorPlan = useCallback((floorPlan: FloorPlan) => {
    setCurrentTables(floorPlan.tables.map(table => ({ ...table, isSelected: false })));
    setCurrentSections(floorPlan.sections.map(section => ({ ...section, isSelected: false })));
    setCurrentDividers(floorPlan.dividers.map(divider => ({ ...divider, isSelected: false })));
    setCurrentDecorations(floorPlan.decorations.map(decoration => ({ ...decoration, isSelected: false })));
    setCanvasSettings({
      width: floorPlan.metadata.canvasWidth,
      height: floorPlan.metadata.canvasHeight,
      backgroundColor: floorPlan.metadata.backgroundColor,
      showGrid: floorPlan.metadata.showGrid,
      gridSize: floorPlan.metadata.gridSize * 20,
      zoom: floorPlan.metadata.zoomLevel,
    });
    setFloorPlanForm({
      name: floorPlan.name,
      description: floorPlan.description || '',
      isActive: floorPlan.isActive,
    });
    setSelectedFloorPlan(floorPlan.id);
    setIsEditMode(true);
  }, []);

  const selectedTable = selectedElement?.type === 'table' ? currentTables.find(table => table.id === selectedElement.id) : null;

  if (!restaurantId) {
    return (
      <Alert>
        <AlertDescription>
          Please select a restaurant to manage floor plans.
        </AlertDescription>
      </Alert>
    );
  }

  if (floorPlansLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div>
          <h1 className="text-xl font-bold">Floor Plan Designer</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your restaurant layout
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Floor Plan Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[200px] justify-between">
                {selectedFloorPlan
                  ? floorPlansData?.data.find(fp => fp.id === selectedFloorPlan)?.name || 'Unknown Plan'
                  : 'Select Floor Plan'
                }
                <ChevronDown className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2">
              <div className="space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setIsEditMode(true);
                    setSelectedFloorPlan(null);
                    loadTemplate();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Floor Plan (Classic Template)
                </Button>
                <Separator />
                {floorPlansData?.data.map((floorPlan) => (
                  <Button
                    key={floorPlan.id}
                    variant={selectedFloorPlan === floorPlan.id ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => loadFloorPlan(floorPlan)}
                  >
                    {floorPlan.name}
                    {floorPlan.isActive && <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {isEditMode && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isCreating || isUpdating || !floorPlanForm.name}
            >
              <Save className="w-4 h-4 mr-2" />
              {selectedFloorPlan ? 'Save' : 'Create'}
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {isEditMode && (
        <div className="flex items-center justify-between p-3 border-b bg-card">
          {/* Left: Tools */}
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={selectedTool} onValueChange={(value) => value && setSelectedTool(value as any)}>
              <ToggleGroupItem value="select" size="sm">
                <MousePointer className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="add-table" size="sm">
                <Square className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Separator orientation="vertical" className="h-6" />

            {/* Table Shape Selector */}
            {selectedTool === 'add-table' && (
              <ToggleGroup type="single" value={newTableShape} onValueChange={(value) => value && setNewTableShape(value as any)}>
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
            )}
          </div>

          {/* Center: Floor Plan Settings */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Name:</Label>
              <Input
                value={floorPlanForm.name}
                onChange={(e) => setFloorPlanForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-8 w-40"
                placeholder="Floor plan name"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPropertiesPanelOpen(!isPropertiesPanelOpen)}
              className={cn(isPropertiesPanelOpen && "bg-accent")}
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
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 p-4 overflow-auto bg-muted/20">
          {isEditMode ? (
            <div className="relative border rounded-lg bg-card shadow-sm">
              <Stage
                width={canvasSettings.width}
                height={canvasSettings.height}
                onClick={handleCanvasClick}
                style={{ backgroundColor: 'hsl(var(--background))' }}
              >
                <Layer>
                  {/* Grid */}
                  {canvasSettings.showGrid && (
                    <>
                      {/* Render grid lines */}
                      {Array.from({ length: Math.ceil(canvasSettings.width / canvasSettings.gridSize) + 1 }, (_, i) => (
                        <Line
                          key={`v-${i}`}
                          points={[i * canvasSettings.gridSize, 0, i * canvasSettings.gridSize, canvasSettings.height]}
                          stroke="hsl(var(--border))"
                          strokeWidth={0.5}
                          opacity={0.3}
                        />
                      ))}
                      {Array.from({ length: Math.ceil(canvasSettings.height / canvasSettings.gridSize) + 1 }, (_, i) => (
                        <Line
                          key={`h-${i}`}
                          points={[0, i * canvasSettings.gridSize, canvasSettings.width, i * canvasSettings.gridSize]}
                          stroke="hsl(var(--border))"
                          strokeWidth={0.5}
                          opacity={0.3}
                        />
                      ))}
                    </>
                  )}

                  {/* Tables */}
                  {currentTables.map((table) => (
                    <TableShape
                      key={table.id}
                      table={table}
                      isSelected={table.isSelected || false}
                      color={table.color || defaultTableColor}
                      onSelect={() => handleElementSelect('table', table.id)}
                      onDragEnd={(e) => handleTableDragEnd(table.id, e)}
                      onTransformEnd={(e) => handleTableTransformEnd(table.id, e)}
                      scale={canvasSettings.zoom}
                      isDraggable={selectedTool === 'select'}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Grid className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Design Your Floor Plan</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Jump in with our classic restaurant template—complete with zones, dividers, and seating—then tailor it to your venue.
                </p>
                <Button
                  onClick={() => {
                    setIsEditMode(true);
                    setSelectedFloorPlan(null);
                    loadTemplate();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Use Classic Template
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {isPropertiesPanelOpen && selectedElement && (
          <div className="w-80 border-l bg-card flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Properties</h3>
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
                    <div>
                      <Label className="text-sm">Label</Label>
                      <Input
                        value={selectedTable.label}
                        onChange={(e) => handleTableUpdate(selectedTable.id, { label: e.target.value })}
                        className="h-8 mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Capacity</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={selectedTable.capacity}
                        onChange={(e) => handleTableUpdate(selectedTable.id, { capacity: parseInt(e.target.value) || 4 })}
                        className="h-8 mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Shape</Label>
                      <Select
                        value={selectedTable.shape}
                        onValueChange={(value) => handleTableUpdate(selectedTable.id, { shape: value as any })}
                      >
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rectangle">Rectangle</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-sm">Width</Label>
                        <Input
                          type="number"
                          min="40"
                          max="200"
                          value={Math.round(selectedTable.width)}
                          onChange={(e) => handleTableUpdate(selectedTable.id, { width: parseInt(e.target.value) || 80 })}
                          className="h-8 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Height</Label>
                        <Input
                          type="number"
                          min="40"
                          max="200"
                          value={Math.round(selectedTable.height)}
                          onChange={(e) => handleTableUpdate(selectedTable.id, { height: parseInt(e.target.value) || 80 })}
                          className="h-8 mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Zone</Label>
                      <Input
                        value={selectedTable.zone || ''}
                        onChange={(e) => handleTableUpdate(selectedTable.id, { zone: e.target.value })}
                        className="h-8 mt-1"
                        placeholder="e.g., VIP, Main, Patio"
                      />
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloorPlanConfigPage;
