import { useState, useCallback } from 'react';
import { Table, FloorPlanData } from '../types';
import { createDefaultTable } from '../utils/floorPlanHelpers';

export const useFloorPlan = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [canvasSize] = useState({ width: 1200, height: 800 });

  const addTable = useCallback((table?: Partial<Table>) => {
    const newTable = table
      ? { ...createDefaultTable(), ...table }
      : createDefaultTable();
    setTables((prev) => [...prev, newTable]);
    return newTable.id;
  }, []);

  const updateTable = useCallback((id: string, updates: Partial<Table>) => {
    setTables((prev) =>
      prev.map((table) => (table.id === id ? { ...table, ...updates } : table))
    );
  }, []);

  const deleteTable = useCallback((id: string) => {
    setTables((prev) => prev.filter((table) => table.id !== id));
  }, []);

  const clearAllTables = useCallback(() => {
    setTables([]);
  }, []);

  const loadFloorPlan = useCallback((data: FloorPlanData) => {
    setTables(data.tables);
  }, []);

  const getFloorPlanData = useCallback((): FloorPlanData => {
    return {
      tables,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
    };
  }, [tables, canvasSize]);

  return {
    tables,
    canvasSize,
    addTable,
    updateTable,
    deleteTable,
    clearAllTables,
    loadFloorPlan,
    getFloorPlanData,
  };
};
