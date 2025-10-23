import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Save, Upload, Download, Trash2, Undo, Redo } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FloorPlanToolbarProps {
  onAddTable: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  tableCount: number;
}

export const FloorPlanToolbar: React.FC<FloorPlanToolbarProps> = ({
  onAddTable,
  onSave,
  onExport,
  onImport,
  onClear,
  tableCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center gap-2">
        <Button onClick={onAddTable} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Table
        </Button>

        <div className="h-6 w-px bg-gray-300 mx-2" />

        <Button onClick={onSave} variant="outline" size="sm">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>

        <Button onClick={onExport} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>

        <Button onClick={handleImportClick} variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {tableCount} {tableCount === 1 ? 'table' : 'tables'}
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={tableCount === 0}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all tables?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all {tableCount} tables from the floor plan.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onClear}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
