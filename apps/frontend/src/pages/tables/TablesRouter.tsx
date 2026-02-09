import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TablesManagementPage from './TablesManagementPage';
import ZonesManagementPage from './ZonesManagementPage';
import TableHeatmapPage from './TableHeatmapPage';

const TablesRouter = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="/tables/management" replace />} />
      <Route path="management" element={<TablesManagementPage />} />
      <Route path="zones" element={<ZonesManagementPage />} />
      <Route path="heatmap" element={<TableHeatmapPage />} />
    </Routes>
  );
};

export default TablesRouter;