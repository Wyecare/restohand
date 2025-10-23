import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Trash2 } from 'lucide-react';
import { Table, TableShape, TableStatus } from '../types';

interface TablePropertiesPanelProps {
  table: Table | null;
  onUpdate: (updates: Partial<Table>) => void;
  onDelete: () => void;
}

export const TablePropertiesPanel: React.FC<TablePropertiesPanelProps> = ({
  table,
  onUpdate,
  onDelete,
}) => {
  if (!table) {
    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Table Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a table to view and edit its properties
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Table Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-label">Label</Label>
          <Input
            id="edit-label"
            value={table.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-capacity">Capacity</Label>
          <Input
            id="edit-capacity"
            type="number"
            min="1"
            max="20"
            value={table.capacity}
            onChange={(e) =>
              onUpdate({ capacity: parseInt(e.target.value) || 1 })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-shape">Shape</Label>
          <Select
            value={table.shape}
            onValueChange={(value: TableShape) => onUpdate({ shape: value })}
          >
            <SelectTrigger id="edit-shape">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rectangle">Rectangle</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="circle">Circle</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-status">Status</Label>
          <Select
            value={table.status}
            onValueChange={(value: TableStatus) => onUpdate({ status: value })}
          >
            <SelectTrigger id="edit-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Available
                </div>
              </SelectItem>
              <SelectItem value="occupied">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Occupied
                </div>
              </SelectItem>
              <SelectItem value="reserved">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  Reserved
                </div>
              </SelectItem>
              <SelectItem value="needs-attention">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  Needs Attention
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>
            <Label className="text-xs">Width</Label>
            <p>{Math.round(table.width)}px</p>
          </div>
          <div>
            <Label className="text-xs">Height</Label>
            <p>{Math.round(table.height)}px</p>
          </div>
          <div>
            <Label className="text-xs">X Position</Label>
            <p>{Math.round(table.x)}px</p>
          </div>
          <div>
            <Label className="text-xs">Y Position</Label>
            <p>{Math.round(table.y)}px</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button variant="destructive" className="w-full" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Table
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
