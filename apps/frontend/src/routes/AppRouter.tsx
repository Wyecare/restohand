import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import Layout from '@/components/Layout';

const AppRouter = () => {
  // Example: if you want to load user session later
  useEffect(() => {
    // placeholder for session restoration logic
  }, []);

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<div />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<div></div>} />
      </Route>

      {/* Protected Routes */}
      <Route element={<div />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<div />} />
          <Route path="/profile" element={<div />} />
          <Route path="/settings" element={<div />} />
        </Route>
      </Route>

      {/* Error Routes */}
      <Route path="/forbidden" element={<div />} />
      <Route path="*" element={<div />} />
    </Routes>
  );
};

export default AppRouter;
