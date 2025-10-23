import type { FloorPlanTable } from '@/store/api/floorPlansApi';

export interface SimpleFloorPlanTemplate {
  name: string;
  description: string;
  tables: FloorPlanTable[];
  metadata: {
    canvasWidth: number;
    canvasHeight: number;
    backgroundColor?: string;
    gridSize?: number;
    showGrid?: boolean;
    zoomLevel?: number;
  };
}

export const SIMPLE_RESTAURANT_TEMPLATE: SimpleFloorPlanTemplate = {
  name: 'Simple Restaurant Layout',
  description: 'Basic restaurant layout with 12 tables for quick setup',
  metadata: {
    canvasWidth: 1000,
    canvasHeight: 700,
    backgroundColor: 'hsl(var(--background))',
    gridSize: 2,
    showGrid: true,
    zoomLevel: 1,
  },
  tables: [
    // Front row (4 tables)
    {
      id: 'table-1',
      x: 150,
      y: 150,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T1',
      capacity: 4,
      zone: 'Main',
    },
    {
      id: 'table-2',
      x: 300,
      y: 150,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T2',
      capacity: 4,
      zone: 'Main',
    },
    {
      id: 'table-3',
      x: 450,
      y: 150,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T3',
      capacity: 4,
      zone: 'Main',
    },
    {
      id: 'table-4',
      x: 600,
      y: 150,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T4',
      capacity: 4,
      zone: 'Main',
    },

    // Middle row (4 tables)
    {
      id: 'table-5',
      x: 150,
      y: 300,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T5',
      capacity: 4,
      zone: 'Main',
    },
    {
      id: 'table-6',
      x: 300,
      y: 300,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T6',
      capacity: 4,
      zone: 'Main',
    },
    {
      id: 'table-7',
      x: 450,
      y: 300,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T7',
      capacity: 4,
      zone: 'Main',
    },
    {
      id: 'table-8',
      x: 600,
      y: 300,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T8',
      capacity: 4,
      zone: 'Main',
    },

    // Back row (4 tables)
    {
      id: 'table-9',
      x: 150,
      y: 450,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T9',
      capacity: 4,
      zone: 'Main',
    },
    {
      id: 'table-10',
      x: 300,
      y: 450,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T10',
      capacity: 4,
      zone: 'Main',
    },
    {
      id: 'table-11',
      x: 450,
      y: 450,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T11',
      capacity: 4,
      zone: 'Main',
    },
    {
      id: 'table-12',
      x: 600,
      y: 450,
      width: 120,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      label: 'T12',
      capacity: 4,
      zone: 'Main',
    },
  ],
};