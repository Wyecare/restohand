import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Filter, Mail, Phone, Clock4, RefreshCcw, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';

import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';
import StaffInvitationForm from '@/components/staff/StaffInvitationForm';

import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useBranchContext } from '@/contexts/BranchContext';

import {
  useListStaffByBranchQuery,
  useResetStaffPinMutation,
  useUpdateStaffMutation,
} from '@/store/api/staffApi';
import type { StaffMember } from '@/store/api/types';
import { useStaffTranslation } from '@/hooks/use-translation';

export default function StaffPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();
  const { t: tStaff } = useStaffTranslation();

  // --- Role options ---
  const roleOptions = [
    { label: tStaff('roles.chef'), value: 'chef' },
    { label: tStaff('roles.waiter'), value: 'waiter' },
    { label: tStaff('roles.cashier'), value: 'cashier' },
    { label: tStaff('roles.manager'), value: 'manager' },
    // owner
    { label: tStaff('roles.owner'), value: 'owner' },
  ];

  // Redirect if no restaurant ID
  if (!restaurantId) return <Navigate to="/onboarding" replace />;

  // --- API Query and Mutations ---
  const branchId = currentBranch?._id;
  const {
    data: staffResponse,
    isFetching,
    isError,
    refetch,
  } = useListStaffByBranchQuery(
    restaurantId && branchId ? { branchId } : skipToken
  );

  const staff = staffResponse ?? [];

  const [resetStaffPin] = useResetStaffPinMutation();
  const [updateStaff] = useUpdateStaffMutation();

  // --- Local state ---
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = React.useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [roleFilter, setRoleFilter] = React.useState<'all' | string>('all');
  const [updatingIds, setUpdatingIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const markUpdating = (id: string) =>
    setUpdatingIds((prev) => new Set(prev).add(id));
  const clearUpdating = (id: string) =>
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  // --- Metrics ---
  const stats = React.useMemo(() => {
    const total = staff.length;
    const active = staff.filter((m) => m.isActive).length;
    const inactive = total - active;
    const roleTotals = staff.reduce<Record<string, number>>((acc, m) => {
      m.roles.forEach((r) => {
        acc[r] = (acc[r] ?? 0) + 1;
      });
      return acc;
    }, {});
    return { total, active, inactive, roleTotals };
  }, [staff]);

  // --- Filters ---
  const filteredStaff = React.useMemo(() => {
    return staff.filter((member) => {
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? member.isActive
          : !member.isActive;
      const matchRole =
        roleFilter === 'all' ? true : member.roles.includes(roleFilter);
      return matchStatus && matchRole;
    });
  }, [staff, statusFilter, roleFilter]);

  async function handleRoleChange(member: StaffMember, nextRole: string) {
    if (member.roles[0] === nextRole) return;
    markUpdating(member.id);
    try {
      await updateStaff({ id: member.id, roles: [nextRole] }).unwrap();
      toast({
        title: tStaff('messages.roleUpdated'),
        description: tStaff('messages.roleUpdateSuccess', {
          name: member.name,
          role:
            roleOptions.find((o) => o.value === nextRole)?.label ?? nextRole,
        }),
      });
    } catch (err) {
      toast({
        title: tStaff('messages.unableToUpdateRole'),
        description:
          err instanceof Error
            ? err.message
            : tStaff('messages.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      clearUpdating(member.id);
    }
  }

  async function handleActiveToggle(member: StaffMember, isActive: boolean) {
    markUpdating(member.id);
    try {
      await updateStaff({ id: member.id, isActive }).unwrap();
      toast({
        title: isActive
          ? tStaff('messages.staffActivated')
          : tStaff('messages.staffDeactivated'),
      });
    } catch (err) {
      toast({
        title: tStaff('messages.unableToUpdateStatus'),
        description:
          err instanceof Error
            ? err.message
            : tStaff('messages.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      clearUpdating(member.id);
    }
  }

  // --- Table setup ---
  const columns = React.useMemo<ColumnDef<StaffMember>[]>(
    () => [
      {
        accessorKey: 'name',
        header: tStaff('table.name'),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="min-w-[8rem]">
              <div className="font-medium">{m.name}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock4 className="h-3.5 w-3.5" />
                {m.lastLoginAt
                  ? tStaff('table.lastLogin', {
                      date: new Date(m.lastLoginAt).toLocaleString(),
                    })
                  : tStaff('table.noLoginYet')}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'roles',
        header: tStaff('table.role'),
        cell: ({ row }) => {
          const m = row.original;
          const currentRole = m.roles[0] ?? roleOptions[0].value;
          return (
            <Select
              value={currentRole}
              onValueChange={(value) => handleRoleChange(m, value)}
              disabled={updatingIds.has(m.id)}
            >
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        id: 'contact',
        header: tStaff('table.contact'),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="text-xs text-muted-foreground">
              {m.phoneNumber && (
                <div className="flex items-center gap-1 break-all">
                  <Phone className="h-3.5 w-3.5" />
                  {m.phoneNumber}
                </div>
              )}
              {m.email && (
                <div className="flex items-center gap-1 break-all">
                  <Mail className="h-3.5 w-3.5" />
                  {m.email}
                </div>
              )}
              {!m.phoneNumber && !m.email && (
                <div className="italic text-muted-foreground/70">
                  {tStaff('table.noContactDetails')}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: tStaff('table.status'),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-2">
              <Switch
                id={`active-${m.id}`}
                checked={m.isActive}
                onCheckedChange={(checked) => handleActiveToggle(m, checked)}
                disabled={updatingIds.has(m.id)}
              />
              <Label
                htmlFor={`active-${m.id}`}
                className="text-xs text-muted-foreground"
              >
                {m.isActive ? tStaff('table.active') : tStaff('table.inactive')}
              </Label>
            </div>
          );
        },
      },
    ],
    [tStaff, roleOptions, updatingIds]
  );

  const table = useReactTable({
    data: filteredStaff,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {tStaff('management.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tStaff('management.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {tStaff('buttons.filters')}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-56 space-y-3"
              sideOffset={8}
            >
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {tStaff('filters.status')}
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(next) => setStatusFilter(next as any)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tStaff('filters.all')}</SelectItem>
                    <SelectItem value="active">
                      {tStaff('table.active')}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {tStaff('table.inactive')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {tStaff('filters.role')}
                </Label>
                <Select
                  value={roleFilter}
                  onValueChange={(next) => setRoleFilter(next)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {tStaff('filters.allRoles')}
                    </SelectItem>
                    {roleOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}…
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          <StaffInvitationForm onSuccess={() => refetch()} />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            {tStaff('buttons.refresh')}
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <MetricsGrid columns={3}>
        <MetricsCard
          title={tStaff('metrics.activeStaff')}
          value={stats.active}
          description={tStaff('metrics.activeStaffDesc')}
          icon={Users}
          iconColor="green"
        />
        <MetricsCard
          title={tStaff('metrics.inactive')}
          value={stats.inactive}
          description={tStaff('metrics.inactiveDesc')}
          icon={Users}
          iconColor="red"
          badge={
            stats.inactive > 0
              ? { text: tStaff('metrics.check'), variant: 'destructive' }
              : undefined
          }
        />
        <MetricsCard
          title={tStaff('metrics.totalStaff')}
          value={stats.total}
          description={tStaff('metrics.totalStaffDesc')}
          icon={Users}
          iconColor="blue"
        />
      </MetricsGrid>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {tStaff('management.teamRoster')}
          </CardTitle>
          <CardDescription className="text-sm">
            {tStaff('management.teamRosterDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="text-center text-sm text-destructive py-10">
              {tStaff('states.errorLoadingStaff')}
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              {tStaff('states.noStaffFound')}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-muted/50">
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((header) => (
                          <th
                            key={header.id}
                            className="text-left px-4 py-2 font-medium text-xs text-muted-foreground uppercase tracking-wide"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t hover:bg-muted/30 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 align-top">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 text-xs text-muted-foreground">
                <div>
                  {tStaff('table.showingStaff', {
                    showing: table.getRowModel().rows.length,
                    total: staff.length,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    {tStaff('table.prev')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    {tStaff('table.next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
