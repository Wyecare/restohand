import { useState, useCallback } from 'react';

export const useTableSelection = () => {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const selectTable = useCallback((id: string | null) => {
    setSelectedTableId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTableId(null);
  }, []);

  return {
    selectedTableId,
    selectTable,
    clearSelection,
  };
};
