export type TableShape = 'rectangle' | 'circle' | 'square';

export type TableStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'needs-attention';

export interface Table {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: TableShape;
  label: string;
  capacity: number;
  status: TableStatus;
  color?: string;
}

export interface FloorPlanData {
  tables: Table[];
  canvasWidth: number;
  canvasHeight: number;
}
