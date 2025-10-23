import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { TableShape, TableStatus } from '../types';

interface AddTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTable: (tableData: {
    label: string;
    capacity: number;
    shape: TableShape;
    status: TableStatus;
  }) => void;
}

export const AddTableDialog: React.FC<AddTableDialogProps> = ({
  open,
  onOpenChange,
  onAddTable,
}) => {
  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [shape, setShape] = useState<TableShape>('rectangle');
  const [status, setStatus] = useState<TableStatus>('available');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTable({
      label: label || `T${Math.floor(Math.random() * 100)}`,
      capacity: parseInt(capacity) || 4,
      shape,
      status,
    });
    // Reset form
    setLabel('');
    setCapacity('4');
    setShape('rectangle');
    setStatus('available');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Table</DialogTitle>
          <DialogDescription>
            Create a new table for your floor plan. Configure its properties
            below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="label" className="text-right">
                Label
              </Label>
              <Input
                id="label"
                placeholder="e.g., T1, A5"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="capacity" className="text-right">
                Capacity
              </Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="20"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shape" className="text-right">
                Shape
              </Label>
              <Select
                value={shape}
                onValueChange={(value: TableShape) => setShape(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rectangle">Rectangle</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(value: TableStatus) => setStatus(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="needs-attention">
                    Needs Attention
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Table</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
