import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { TableManagementPanel } from '@/components/tables/TableManagementPanel';
import { ZoneManagementPanel } from '@/components/tables/ZoneManagementPanel';
import { ServerAssignmentOverview } from '@/components/tables/ServerAssignmentOverview';

const TablesPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  // Local state
  const [activeTab, setActiveTab] = useState<'tables' | 'zones' | 'servers'>(
    'tables'
  );

  if (!restaurantId) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tables Management
          </h1>
          <p className="text-muted-foreground">
            Manage your restaurant tables, zones, and waiter assignments
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-fit grid-cols-3">
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="servers">Waiter Assignment</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-6">
          <TableManagementPanel restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="zones" className="space-y-6">
          <ZoneManagementPanel restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="servers" className="space-y-6">
          <ServerAssignmentOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TablesPage;
