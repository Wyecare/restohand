import React, { useState } from 'react';
import { FloorPlanCanvas } from './components/FloorPlanCanvas';
import { FloorPlanToolbar } from './components/FloorPlanToolbar';
import { TablePropertiesPanel } from './components/TablePropertiesPanel';
import { AddTableDialog } from './components/AddTableDialog';
import { useFloorPlan } from './hooks/useFloorPlan';
import { useTableSelection } from './hooks/useTableSelection';
import { exportFloorPlan, importFloorPlan } from './utils/exportFloorPlan';
import { useToast } from '@/hooks/use-toast';

const FloorPlanPage: React.FC = () => {
  const {
    tables,
    canvasSize,
    addTable,
    updateTable,
    deleteTable,
    clearAllTables,
    loadFloorPlan,
    getFloorPlanData,
  } = useFloorPlan();

  const { selectedTableId, selectTable, clearSelection } = useTableSelection();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;

  const handleAddTable = (tableData: any) => {
    addTable(tableData);
    toast({
      title: 'Table added',
      description: 'New table has been added to the floor plan.',
    });
  };

  const handleSave = () => {
    // In a real app, this would save to backend
    const data = getFloorPlanData();
    localStorage.setItem('floorPlan', JSON.stringify(data));
    toast({
      title: 'Floor plan saved',
      description: 'Your floor plan has been saved successfully.',
    });
  };

  const handleExport = () => {
    const data = getFloorPlanData();
    exportFloorPlan(data);
    toast({
      title: 'Floor plan exported',
      description: 'Your floor plan has been exported as JSON.',
    });
  };

  const handleImport = async (file: File) => {
    try {
      const data = await importFloorPlan(file);
      loadFloorPlan(data);
      clearSelection();
      toast({
        title: 'Floor plan imported',
        description: 'Floor plan has been loaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description:
          'Failed to import floor plan. Please check the file format.',
        variant: 'destructive',
      });
    }
  };

  const handleClear = () => {
    clearAllTables();
    clearSelection();
    toast({
      title: 'Floor plan cleared',
      description: 'All tables have been removed.',
    });
  };

  const handleDeleteSelectedTable = () => {
    if (selectedTableId) {
      deleteTable(selectedTableId);
      clearSelection();
      toast({
        title: 'Table deleted',
        description: 'Table has been removed from the floor plan.',
      });
    }
  };

  const handleUpdateSelectedTable = (updates: any) => {
    if (selectedTableId) {
      updateTable(selectedTableId, updates);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Floor Plan Designer
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Design and manage your restaurant floor plan
        </p>
      </div>

      {/* Toolbar */}
      <FloorPlanToolbar
        onAddTable={() => setIsAddDialogOpen(true)}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
        tableCount={tables.length}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 p-6 overflow-auto">
          <FloorPlanCanvas
            tables={tables}
            canvasSize={canvasSize}
            selectedTableId={selectedTableId}
            onTableSelect={selectTable}
            onTableUpdate={updateTable}
            onCanvasClick={clearSelection}
          />
        </div>

        {/* Properties Panel */}
        <div className="p-6 bg-white border-l">
          <TablePropertiesPanel
            table={selectedTable}
            onUpdate={handleUpdateSelectedTable}
            onDelete={handleDeleteSelectedTable}
          />
        </div>
      </div>

      {/* Add Table Dialog */}
      <AddTableDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddTable={handleAddTable}
      />
    </div>
  );
};

export default FloorPlanPage;
