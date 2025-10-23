import { Table, TableStatus } from '../types';

export const getStatusColor = (status: TableStatus): string => {
  switch (status) {
    case 'available':
      return '#22c55e'; // green
    case 'occupied':
      return '#ef4444'; // red
    case 'reserved':
      return '#eab308'; // yellow
    case 'needs-attention':
      return '#f97316'; // orange
    default:
      return '#94a3b8'; // gray
  }
};

export const generateTableId = (): string => {
  return `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createDefaultTable = (x = 100, y = 100): Table => {
  return {
    id: generateTableId(),
    x,
    y,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'rectangle',
    label: `T${Math.floor(Math.random() * 100)}`,
    capacity: 4,
    status: 'available',
  };
};
