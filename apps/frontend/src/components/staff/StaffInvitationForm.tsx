import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, Mail, Loader2 } from 'lucide-react';
import { useCreateStaffInvitationMutation } from '@/store/api/staffApi';
import { useBranchContext } from '@/contexts/BranchContext';

const inviteStaffSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  phoneNumber: z
    .string()
    .min(10, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  branchId: z.string().min(1, 'Please select a branch'),
  role: z.enum(['chef', 'waiter', 'cashier', 'manager'], {
    required_error: 'Please select a role',
  }),
});

type InviteStaffForm = z.infer<typeof inviteStaffSchema>;

interface StaffInvitationFormProps {
  onSuccess?: () => void;
}

export default function StaffInvitationForm({
  onSuccess,
}: StaffInvitationFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { branches, currentBranch, canAccessAllBranches } = useBranchContext();
  const [createStaffInvitation, { isLoading }] =
    useCreateStaffInvitationMutation();

  const form = useForm<InviteStaffForm>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      branchId: currentBranch?._id || '',
      role: undefined,
    },
  });

  // Ensure branchId is set when currentBranch changes
  React.useEffect(() => {
    if (
      currentBranch?._id &&
      (!canAccessAllBranches || branches.length === 1)
    ) {
      form.setValue('branchId', currentBranch._id);
    }
  }, [currentBranch, canAccessAllBranches, branches.length, form]);

  // Debug: log form state
  console.log('🔍 StaffInvitationForm Debug:', {
    currentBranch,
    branches,
    canAccessAllBranches,
    formBranchId: form.watch('branchId'),
    formErrors: form.formState.errors,
  });

  const onSubmit = async (data: InviteStaffForm) => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
        branchId: data.branchId,
        role: data.role,
      };

      await createStaffInvitation(payload).unwrap();

      toast({
        title: 'Invitation sent!',
        description: `A staff invitation has been sent to ${data.email}`,
      });

      form.reset({
        name: '',
        email: '',
        phoneNumber: '',
        branchId: currentBranch?._id || '',
        role: undefined,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Failed to send invitation',
        description: error?.data?.message || 'Please try again',
        variant: 'default',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Staff Member
          </DialogTitle>
          <DialogDescription>
            Send an email invitation to add a new staff member to your
            restaurant
            {branches.length > 1 && canAccessAllBranches
              ? ' and assign them to a specific branch'
              : ''}
            .
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="staff@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canAccessAllBranches && branches.length > 1 ? (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch._id} value={branch._id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              // Show current branch for single-branch managers
              currentBranch && (
                <div className="space-y-2">
                  <FormLabel>Branch</FormLabel>
                  <div className="p-3 bg-muted rounded-md border">
                    <span className="text-sm font-medium">
                      {currentBranch.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      (Your assigned branch)
                    </span>
                  </div>
                </div>
              )
            )}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="waiter">Waiter</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      {canAccessAllBranches && (
                        <SelectItem value="manager">Manager</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
