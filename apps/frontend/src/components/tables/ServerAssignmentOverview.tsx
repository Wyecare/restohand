import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Settings } from 'lucide-react';

export const ServerAssignmentOverview: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Assignments</CardTitle>
        <CardDescription>Manage server assignments for tables</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">
            Server Assignment Overview
          </h3>
          <p>Assign waiters to specific tables from the Tables tab</p>
          <p className="text-sm mt-2">
            Use the "Assign Waiter" option in the table actions menu to assign
            specific waiters to tables
          </p>
          <p className="text-sm mt-1 ">
            This ensures that call waiter notifications are properly routed to
            the assigned staff members
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
