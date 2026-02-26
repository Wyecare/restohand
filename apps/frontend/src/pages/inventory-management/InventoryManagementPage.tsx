import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { InventoryItemsView } from './views/InventoryItemsView';
import { SuppliersView } from './views/SuppliersView';
import { PurchaseOrdersView } from './views/PurchaseOrdersView';
import { TransferOrdersView } from './views/TransferOrdersView';
import { InventoryCountsView } from './views/InventoryCountsView';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';

export function InventoryManagementPage() {
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect to inventory items if on base /inventory route
  useEffect(() => {
    if (location.pathname === '/inventory') {
      navigate('/inventory/items', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="mx-auto px-1 py-1 space-y-4">
      <Routes>
        {/* Inventory Items route - default view */}
        <Route index element={<InventoryItemsView />} />
        <Route path="items" element={<InventoryItemsView />} />

        {/* Suppliers route */}
        <Route path="suppliers" element={<SuppliersView />} />

        {/* Purchase Orders route */}
        <Route path="purchase-orders" element={<PurchaseOrdersView />} />

        {/* Transfer Orders route */}
        <Route path="transfer-orders" element={<TransferOrdersView />} />

        {/* Inventory Counts route */}
        <Route path="counts" element={<InventoryCountsView />} />
      </Routes>
    </div>
  );
}