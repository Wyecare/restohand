import { useCallback, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, Share2, Mail, Phone, Clock4, RefreshCcw, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useInviteStaffMutation,
  useListStaffQuery,
  useResetStaffPinMutation,
  useUpdateStaffMutation,
} from '@/store/api/staffApi';
import type { StaffMember } from '@/store/api/types';

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

const StaffPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(roleOptions[0].value);
  const [shareContext, setShareContext] = useState<InviteShareContext | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(() => new Set());

  const {
    data: staff = [],
    isLoading,
    isError,
  } = useListStaffQuery(undefined, { skip: !restaurantId });
  const [inviteStaff, { isLoading: isInviting }] = useInviteStaffMutation();
  const [resetStaffPin] = useResetStaffPinMutation();
  const [updateStaff] = useUpdateStaffMutation();

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((member) => member.isActive).length;
    const inactive = total - active;
    const roleTotals = staff.reduce<Record<string, number>>((acc, member) => {
      member.roles.forEach((memberRole) => {
        acc[memberRole] = (acc[memberRole] ?? 0) + 1;
      });
      return acc;
    }, {});

    return { total, active, inactive, roleTotals };
  }, [staff]);

  const shareMessage = useMemo(() => {
    if (!shareContext) {
      return '';
    }

    const roleLabel =
      roleOptions.find((option) => option.value === shareContext.role)?.label ??
      shareContext.role;
    const firstName = shareContext.name?.split?.(' ')?.[0] ?? shareContext.name;
    const loginUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/staff-login`
        : 'https://restohand.app/staff-login';
    const contactLine = shareContext.phoneNumber
      ? `Sign in with phone: ${shareContext.phoneNumber}`
      : shareContext.email
        ? `Sign in with email: ${shareContext.email}`
        : undefined;
    const intro =
      shareContext.action === 'invite'
        ? `You're invited to Restohand as ${roleLabel}.`
        : `Your Restohand PIN has been reset for the ${roleLabel} dashboard.`;

    const lines = [
      `Hi ${firstName},`,
      intro,
      `Use PIN ${shareContext.temporaryPin} to log in.`,
      contactLine,
      `Dashboard: ${loginUrl}`,
      '',
      'Need help? Ask your manager.',
    ].filter(Boolean) as string[];

    return lines.join('\n');
  }, [shareContext]);

  const canAttemptClipboard =
    typeof navigator !== 'undefined' && !!navigator.clipboard;
  const canAttemptNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const markUpdating = useCallback((id: string) => {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearUpdating = useCallback((id: string) => {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name) {
      toast({
        title: 'Name required',
        description: 'Please provide the staff member name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await inviteStaff({
        name,
        email: email || undefined,
        phoneNumber: phone || undefined,
        role,
      }).unwrap();
      toast({
        title: 'Staff invited',
        description:
          'Temporary PIN generated. Share the details with your teammate.',
      });
      setShareContext({
        id: response.staff.id,
        name: response.staff.name,
        email: response.staff.email,
        phoneNumber: response.staff.phoneNumber,
        role: response.staff.roles[0] ?? role,
        temporaryPin: response.temporaryPin,
        action: 'invite',
      });
      setName('');
      setEmail('');
      setPhone('');
      setRole(roleOptions[0].value);
    } catch (error) {
      toast({
        title: 'Unable to invite staff',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (user: StaffMember, isActive: boolean) => {
    markUpdating(user.id);
    try {
      await updateStaff({ id: user.id, isActive }).unwrap();
      toast({
        title: isActive ? 'Staff activated' : 'Staff deactivated',
      });
    } catch (error) {
      toast({
        title: 'Unable to update staff',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      clearUpdating(user.id);
    }
  };

  const handleRoleChange = async (user: StaffMember, nextRole: string) => {
    if (user.roles[0] === nextRole) {
      return;
    }

    markUpdating(user.id);
    try {
      await updateStaff({ id: user.id, roles: [nextRole] }).unwrap();
      const roleLabel =
        roleOptions.find((option) => option.value === nextRole)?.label ??
        nextRole;
      toast({
        title: 'Role updated',
        description: `${user.name} is now set as ${roleLabel}.`,
      });
    } catch (error) {
      toast({
        title: 'Unable to update role',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      clearUpdating(user.id);
    }
  };

  const handleResetPin = async (user: StaffMember) => {
    markUpdating(user.id);
    try {
      const response = await resetStaffPin(user.id).unwrap();
      toast({
        title: 'PIN reset',
        description: 'Share the new PIN so your teammate can log back in.',
      });
      setShareContext({
        id: response.staff.id,
        name: response.staff.name,
        email: response.staff.email,
        phoneNumber: response.staff.phoneNumber,
        role: response.staff.roles[0] ?? user.roles[0],
        temporaryPin: response.temporaryPin,
        action: 'reset',
      });
    } catch (error) {
      toast({
        title: 'Unable to reset PIN',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      clearUpdating(user.id);
    }
  };

  const handleCopyShare = useCallback(async () => {
    if (!shareContext || !shareMessage) {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast({
        title: 'Copy unavailable',
        description: 'Clipboard access is not supported on this device.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(shareMessage);
      toast({
        title: 'Copied to clipboard',
        description: 'Invite message ready to paste anywhere.',
      });
    } catch (error) {
      toast({
        title: 'Unable to copy',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [shareContext, shareMessage, toast]);

  const handleNativeShare = useCallback(async () => {
    if (!shareContext || !shareMessage) {
      return;
    }

    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      await handleCopyShare();
      return;
    }

    try {
      await navigator.share({
        title:
          shareContext.action === 'invite'
            ? 'Restohand staff invite'
            : 'Restohand staff PIN reset',
        text: shareMessage,
      });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return;
      }
      toast({
        title: 'Unable to share',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [handleCopyShare, shareContext, shareMessage, toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Staff management</h1>
        <p className="text-muted-foreground">
          Invite kitchen and floor staff. Share the temporary PIN for their first login.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active team members</CardDescription>
            <CardTitle className="text-3xl font-semibold">{stats.active}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Staff currently able to access their dashboards.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive team</CardDescription>
            <CardTitle className="text-3xl font-semibold">{stats.inactive}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Toggle them back on when they rejoin the shift.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Role coverage</CardDescription>
            <CardTitle className="text-lg font-semibold">Kitchen &amp; Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={stats.roleTotals[option.value] ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {option.label}: {stats.roleTotals[option.value] ?? 0}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite staff</CardTitle>
          <CardDescription>
            Generate a temporary PIN to share with your team member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleInvite}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="staff-name">
                  Full name
                </Label>
                <Input
                  id="staff-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Anita Chef"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="staff-email">
                  Email (optional)
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="chef@restohand.in"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="staff-phone">
                  Phone (optional)
                </Label>
                <Input
                  id="staff-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="staff-role">
                  Role
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="staff-role">
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                We generate a one-time PIN. Share it with your teammate to complete their first login.
              </p>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Inviting...' : 'Invite staff'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {shareContext && shareMessage && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Share staff access</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {shareContext.action === 'invite' ? 'New invite' : 'PIN reset'}
                </Badge>
              </div>
              <CardDescription>
                Send this message to {shareContext.name} so they can log in immediately.
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
                variant="default"
                size="sm"
                onClick={handleCopyShare}
                disabled={!canAttemptClipboard}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy message
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNativeShare}
                disabled={!canAttemptNativeShare && !canAttemptClipboard}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
            <div className="whitespace-pre-wrap rounded-md border border-dashed border-muted-foreground/40 bg-background p-4 text-sm font-mono leading-relaxed text-muted-foreground">
              {shareMessage}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team roster</CardTitle>
          <CardDescription>
            Active staff who can access the kitchen or service dashboards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          )}

          {isError && !isLoading && (
            <div className="py-10 text-center text-sm text-destructive">
              Unable to load staff members.
            </div>
          )}

          {!isLoading && !isError && staff.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No staff yet. Invite your kitchen and service team above.
            </div>
          )}

          {!isLoading && !isError && staff.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {staff.map((member) => {
                const primaryRole = member.roles[0] ?? roleOptions[0].value;
                const isUpdating = updatingIds.has(member.id);
                return (
                  <Card key={member.id} className="border-muted-foreground/20">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-semibold">
                            {member.name}
                          </CardTitle>
                          <CardDescription>
                            Joined {new Date(member.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge variant={member.isActive ? 'default' : 'secondary'}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock4 className="h-3.5 w-3.5" />
                        {member.lastLoginAt
                          ? `Last login ${new Date(member.lastLoginAt).toLocaleString()}`
                          : 'No login activity yet'}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {member.phoneNumber && (
                          <p className="flex items-center gap-2 break-all">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {member.phoneNumber}
                          </p>
                        )}
                        {member.email && (
                          <p className="flex items-center gap-2 break-all">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {member.email}
                          </p>
                        )}
                        {!member.phoneNumber && !member.email && (
                          <p className="text-xs italic">
                            No contact details provided.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor={`role-${member.id}`}
                          className="text-xs font-semibold uppercase text-muted-foreground"
                        >
                          Role
                        </Label>
                        <Select
                          value={primaryRole}
                          onValueChange={(value) => handleRoleChange(member, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger id={`role-${member.id}`}>
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
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPin(member)}
                          disabled={isUpdating}
                        >
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          Reset PIN
                        </Button>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`active-${member.id}`}
                            checked={member.isActive}
                            onCheckedChange={(checked) =>
                              handleToggleActive(member, checked)
                            }
                            disabled={isUpdating}
                          />
                          <Label
                            htmlFor={`active-${member.id}`}
                            className="text-sm text-muted-foreground"
                          >
                            {member.isActive ? 'Active' : 'Inactive'}
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffPage;
