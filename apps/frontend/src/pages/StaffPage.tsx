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
import {
  Copy,
  Share2,
  Filter,
  Mail,
  Phone,
  Clock4,
  RefreshCcw,
  X,
  UserPlus2,
  Users,
  QrCode,
} from 'lucide-react';
import { skipToken } from '@reduxjs/toolkit/query';

import { Navigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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

import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';

import {
  useInviteStaffMutation,
  useListStaffQuery,
  useResetStaffPinMutation,
  useUpdateStaffMutation,
} from '@/store/api/staffApi';

import type { StaffMember } from '@/store/api/types';
import { StaffQrGenerator } from '@/components/staff/StaffQrGenerator';

const roleOptions = [
  { label: 'Chef', value: 'chef' },
  { label: 'Waiter', value: 'waiter' },
  { label: 'Cashier', value: 'cashier' },
];

type InviteShareContext = {
  id: string;
  name: string;
  role: string;
  email?: string;
  phoneNumber?: string;
  temporaryPin: string;
  action: 'invite' | 'reset';
};

export default function StaffPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();

  // block unauth'd restaurant
  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  // --- Queries & mutations ---
  const {
    data: staff = [],
    isFetching,
    isError,
    refetch,
  } = useListStaffQuery(undefined, {
    skip: !restaurantId,
  });

  const [inviteStaff, { isLoading: isInviting }] = useInviteStaffMutation();
  const [resetStaffPin] = useResetStaffPinMutation();
  const [updateStaff] = useUpdateStaffMutation();

  // --- Local state ---
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = React.useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [roleFilter, setRoleFilter] = React.useState<'all' | string>('all');

  const [shareContext, setShareContext] =
    React.useState<InviteShareContext | null>(null);

  // invite dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false);
  const [inviteName, setInviteName] = React.useState('');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [invitePhone, setInvitePhone] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState(roleOptions[0].value);

  // track per-row async updates
  const [updatingIds, setUpdatingIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const markUpdating = (id: string) =>
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

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

  // --- Filters applied to staff list ---
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

  // --- Invite flow ---
  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a staff name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await inviteStaff({
        name: inviteName,
        email: inviteEmail || undefined,
        phoneNumber: invitePhone || undefined,
        role: inviteRole,
      }).unwrap();

      toast({
        title: 'Staff invited',
        description: 'Temporary PIN generated. Share it so they can log in.',
      });

      setShareContext({
        id: res.staff.id,
        name: res.staff.name,
        email: res.staff.email,
        phoneNumber: res.staff.phoneNumber,
        role: res.staff.roles[0] ?? inviteRole,
        temporaryPin: res.temporaryPin,
        action: 'invite',
      });

      setDialogOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteRole(roleOptions[0].value);
    } catch (err) {
      toast({
        title: 'Unable to invite staff',
        description:
          err instanceof Error ? err.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  }

  // --- Row actions ---
  async function handleResetPin(member: StaffMember) {
    markUpdating(member.id);
    try {
      const res = await resetStaffPin(member.id).unwrap();

      toast({
        title: 'PIN reset',
        description: 'Share the new PIN so they can log back in.',
      });

      setShareContext({
        id: res.staff.id,
        name: res.staff.name,
        email: res.staff.email,
        phoneNumber: res.staff.phoneNumber,
        role: res.staff.roles[0] ?? member.roles[0],
        temporaryPin: res.temporaryPin,
        action: 'reset',
      });
    } catch (err) {
      toast({
        title: 'Unable to reset PIN',
        description:
          err instanceof Error ? err.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      clearUpdating(member.id);
    }
  }

  async function handleRoleChange(member: StaffMember, nextRole: string) {
    if (member.roles[0] === nextRole) return;
    markUpdating(member.id);

    try {
      await updateStaff({
        id: member.id,
        roles: [nextRole],
      }).unwrap();

      const roleLabel =
        roleOptions.find((o) => o.value === nextRole)?.label ?? nextRole;

      toast({
        title: 'Role updated',
        description: `${member.name} is now ${roleLabel}.`,
      });
    } catch (err) {
      toast({
        title: 'Unable to update role',
        description:
          err instanceof Error ? err.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      clearUpdating(member.id);
    }
  }

  async function handleActiveToggle(member: StaffMember, isActive: boolean) {
    markUpdating(member.id);

    try {
      await updateStaff({
        id: member.id,
        isActive,
      }).unwrap();

      toast({
        title: isActive ? 'Staff activated' : 'Staff deactivated',
      });
    } catch (err) {
      toast({
        title: 'Unable to update status',
        description:
          err instanceof Error ? err.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      clearUpdating(member.id);
    }
  }

  // --- Table columns (TanStack style, but using our own row/table markup) ---
  const columns = React.useMemo<ColumnDef<StaffMember>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="min-w-[8rem]">
              <div className="font-medium leading-tight">{m.name}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock4 className="h-3.5 w-3.5" />
                {m.lastLoginAt
                  ? `Last login ${new Date(m.lastLoginAt).toLocaleString()}`
                  : 'No login yet'}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'roles',
        header: 'Role',
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
        header: 'Contact',
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="text-xs text-muted-foreground leading-relaxed">
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
                  No contact details
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
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
                {m.isActive ? 'Active' : 'Inactive'}
              </Label>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const m = row.original;
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleResetPin(m)}
              disabled={updatingIds.has(m.id)}
              className="h-8 px-2 text-xs"
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Reset PIN
            </Button>
          );
        },
      },
    ],
    [handleActiveToggle, handleResetPin, handleRoleChange, updatingIds]
  );

  // --- TanStack table instance ---
  const table = useReactTable({
    data: filteredStaff,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // --- share message for Invite / Reset PIN ---
  const shareMessage = React.useMemo(() => {
    if (!shareContext) return '';

    const roleLabel =
      roleOptions.find((r) => r.value === shareContext.role)?.label ??
      shareContext.role;

    const loginUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/staff-login`
        : 'https://restohand.app/staff-login';

    const contactLine = shareContext.phoneNumber
      ? `Login with phone: ${shareContext.phoneNumber}`
      : shareContext.email
      ? `Login with email: ${shareContext.email}`
      : undefined;

    const intro =
      shareContext.action === 'invite'
        ? `You're invited to Restohand as ${roleLabel}.`
        : `Your Restohand PIN has been reset for the ${roleLabel} dashboard.`;

    const firstName = shareContext.name?.split?.(' ')?.[0] ?? shareContext.name;

    const msgLines = [
      `Hi ${firstName},`,
      intro,
      `Use PIN ${shareContext.temporaryPin} to sign in.`,
      contactLine,
      `Dashboard: ${loginUrl}`,
      '',
      'Need help? Ask your manager.',
    ].filter(Boolean) as string[];

    return msgLines.join('\n');
  }, [shareContext]);

  const handleCopyShare = async () => {
    if (!shareMessage) return;
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast({
        title: 'Copied to clipboard',
        description: 'Message ready to paste in WhatsApp / SMS.',
      });
    } catch (err) {
      toast({
        title: 'Unable to copy',
        description:
          err instanceof Error ? err.message : 'Clipboard not available',
        variant: 'destructive',
      });
    }
  };

  const handleNativeShare = async () => {
    if (!shareMessage) return;

    const canShare =
      typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    if (!canShare) {
      await handleCopyShare();
      return;
    }

    try {
      await navigator.share({
        title:
          shareContext?.action === 'invite'
            ? 'Restohand staff invite'
            : 'Restohand staff PIN reset',
        text: shareMessage,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast({
        title: 'Unable to share',
        description:
          err instanceof Error ? err.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">
            Staff Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Invite staff, update roles, and control access.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-56 space-y-3"
              sideOffset={8}
            >
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Status
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(next: 'all' | 'active' | 'inactive') =>
                    setStatusFilter(next)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Role
                </Label>
                <Select
                  value={roleFilter}
                  onValueChange={(next) => setRoleFilter(next)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {roleOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          {/* QR Code invite button (NEW PRIMARY METHOD) */}
          <Button size="sm" onClick={() => setQrDialogOpen(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR
          </Button>

          {/* Legacy invite button (SMS method) */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
          >
            <UserPlus2 className="h-4 w-4 mr-2" />
            Legacy Invite
          </Button>

          {/* Refresh button */}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics row */}
      <MetricsGrid columns={3}>
        <MetricsCard
          title="Active Staff"
          value={stats.active}
          description="Currently allowed to log in"
          icon={Users}
          iconColor="green"
        />
        <MetricsCard
          title="Inactive"
          value={stats.inactive}
          description="Access turned off"
          icon={Users}
          iconColor="red"
          badge={
            stats.inactive > 0
              ? { text: 'Check', variant: 'destructive' }
              : undefined
          }
        />
        <MetricsCard
          title="Total Staff"
          value={stats.total}
          description="All registered members"
          icon={Users}
          iconColor="blue"
        />
      </MetricsGrid>

      {/* Staff table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Team Roster</CardTitle>
          <CardDescription className="text-sm">
            Roles, contact info, and access status.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isFetching ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner /> {JSON.stringify(isFetching)}
            </div>
          ) : isError ? (
            <div className="text-center text-sm text-destructive py-10">
              Unable to load staff members.
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              No staff found. Try changing filters or invite your first staff
              member.
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
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

              {/* Pagination footer */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 text-xs text-muted-foreground">
                <div>
                  Showing {table.getRowModel().rows.length} of{' '}
                  {table.getRowCount()} staff
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Share block (after invite / pin reset) */}
      {shareContext && (
        <Card className="border-primary/40 border-dashed bg-primary/5">
          <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-semibold">
                  Share staff access
                </CardTitle>
                <Badge variant="outline" className="capitalize text-xs">
                  {shareContext.action === 'invite'
                    ? 'New invite'
                    : 'PIN reset'}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                Send this message to {shareContext.name} so they can log in.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Dismiss share prompt"
              onClick={() => setShareContext(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="text-xs"
                onClick={handleCopyShare}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy message
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={handleNativeShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>

            <div className="whitespace-pre-wrap rounded-md border border-dashed border-muted-foreground/40 bg-background p-4 text-xs font-mono leading-relaxed text-muted-foreground">
              {shareMessage}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Staff</DialogTitle>
            <DialogDescription className="text-sm">
              Generate a one-time PIN and share it with your teammate so they
              can log in.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm font-medium" htmlFor="invite-name">
                  Full name
                </Label>
                <Input
                  id="invite-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Anita Chef"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="invite-email">
                  Email (optional)
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="chef@restohand.in"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="invite-phone">
                  Phone (optional)
                </Label>
                <Input
                  id="invite-phone"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+91..."
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm font-medium" htmlFor="invite-role">
                  Role
                </Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="sm:min-w-[90px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isInviting}
                className="sm:min-w-[120px]"
              >
                {isInviting ? 'Inviting...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Generator Dialog */}
      <StaffQrGenerator isOpen={qrDialogOpen} onOpenChange={setQrDialogOpen} />
    </div>
  );
}
