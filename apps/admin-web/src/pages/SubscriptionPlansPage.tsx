import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Edit,
  Trash2,
  CreditCard,
  Calendar,
  DollarSign,
  Package,
  Star,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useGetCashfreePlansQuery,
  useGetRecommendedPlanTemplatesQuery,
  useCreateCashfreePlanMutation,
  useDeleteCashfreePlanMutation,
  useImportCashfreePlanMutation,
} from '@/store/api/subscriptionPlanApi';

const createPlanSchema = z.object({
  plan_name: z.string().min(1, 'Plan name is required'),
  plan_type: z.enum(['PERIODIC', 'ON_DEMAND']),
  plan_amount: z.number().min(1, 'Minimum amount is ₹1'),
  plan_max_amount: z.number().min(1, 'Minimum amount is ₹1'),
  plan_max_cycles: z.number().min(1).max(999),
  plan_intervals: z.number().min(1),
  plan_currency: z.string().default('INR'),
  plan_interval_type: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']),
  plan_note: z.string().optional(),

  // Business Model Required Fields
  tier: z.enum(['starter', 'professional', 'enterprise']),
  display_name: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  features: z.array(z.string()).default([]),
  is_popular: z.boolean().default(false),

  // Business Model Usage Limits
  usage_limits: z.object({
    max_branches: z.number().min(-1),
    max_tables: z.number().min(-1),
    max_staff: z.number().min(-1),
    max_menu_items: z.number().min(-1),
    max_monthly_orders: z.number().optional(),
  }),

  // Business Model Pricing Structure
  pricing: z.object({
    base_subscription_fee: z.number().min(1),
    transaction_fee_percentage: z.number().min(0).max(100),
    currency: z.string().default('INR'),
  }),

  // Feature Gates per Plan
  feature_access: z.object({
    qr_menu_ordering: z.boolean().default(true),
    digital_receipts: z.boolean().default(true),
    basic_pos: z.boolean().default(true),
    order_management: z.boolean().default(true),
    real_time_analytics: z.boolean().default(true),
    advanced_analytics: z.boolean().default(false),
    customer_crm: z.boolean().default(false),
    inventory_management: z.boolean().default(false),
    multi_location_management: z.boolean().default(false),
    priority_support: z.boolean().default(false),
    custom_integrations: z.boolean().default(false),
    api_access: z.boolean().default(false),
    white_label_options: z.boolean().default(false),
  }),

  // Target Market Information
  target_market: z.object({
    segment: z.string(),
    ideal_size: z.string(),
    use_cases: z.array(z.string()),
  }).optional(),

  // Legacy for backward compatibility
  plan_metadata: z
    .object({
      tier: z.string().optional(),
      features: z.string().optional(),
      display_name: z.string().optional(),
      is_popular: z.boolean().optional(),
    })
    .optional(),
});

type CreatePlanFormData = z.infer<typeof createPlanSchema>;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatInterval = (intervals: number, intervalType: string) => {
  if (intervals === 1) {
    return intervalType.toLowerCase();
  }
  return `${intervals} ${intervalType.toLowerCase()}s`;
};

const SubscriptionPlansPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPlanId, setImportPlanId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch subscription plans using RTK Query
  const {
    data: plans,
    isLoading: plansLoading,
    error: plansError,
  } = useGetCashfreePlansQuery();

  // Fetch recommended templates using RTK Query
  const { data: templates, isLoading: templatesLoading } =
    useGetRecommendedPlanTemplatesQuery();

  // Create plan mutation using RTK Query
  const [createPlan, { isLoading: createLoading }] =
    useCreateCashfreePlanMutation();

  // Delete plan mutation using RTK Query
  const [deletePlan] = useDeleteCashfreePlanMutation();

  // Import plan mutation using RTK Query
  const [importPlan, { isLoading: importLoading }] =
    useImportCashfreePlanMutation();

  const form = useForm<CreatePlanFormData>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      plan_type: 'PERIODIC',
      plan_currency: 'INR',
      plan_interval_type: 'MONTH',
      plan_intervals: 1,
      plan_max_cycles: 12,
      tier: 'starter',
      display_name: '',
      is_popular: false,
      usage_limits: {
        max_branches: 1,
        max_tables: 20,
        max_staff: 5,
        max_menu_items: 75,
      },
      pricing: {
        base_subscription_fee: 99900, // ₹999 in paisa
        transaction_fee_percentage: 2.0,
        currency: 'INR',
      },
      feature_access: {
        qr_menu_ordering: true,
        digital_receipts: true,
        basic_pos: true,
        order_management: true,
        real_time_analytics: true,
        advanced_analytics: false,
        customer_crm: false,
        inventory_management: false,
        multi_location_management: false,
        priority_support: false,
        custom_integrations: false,
        api_access: false,
        white_label_options: false,
      },
    },
  });

  const onSubmit = async (data: CreatePlanFormData) => {
    try {
      // Convert rupees to paisa for backend/Cashfree
      const planData = {
        ...data,
        plan_amount: data.plan_amount * 100, // Convert to paisa
        plan_max_amount: data.plan_max_amount * 100, // Convert to paisa
      };

      await createPlan(planData).unwrap();
      toast({
        title: 'Success',
        description: 'Subscription plan created successfully',
      });
      setIsCreateDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to create plan: ${
          error.data?.message || error.message
        }`,
        variant: 'destructive',
      });
    }
  };

  const handleUseTemplate = (template: any) => {
    form.reset({
      plan_name: template.plan_name,
      plan_type: template.plan_type,
      plan_amount: Math.round(template.plan_recurring_amount / 100), // Convert paisa to rupees
      plan_max_amount: Math.round(template.plan_max_amount / 100), // Convert paisa to rupees
      plan_max_cycles: template.plan_max_cycles,
      plan_intervals: template.plan_intervals,
      plan_currency: template.plan_currency,
      plan_interval_type: template.plan_interval_type,
      plan_note: template.plan_note,

      // Business Model Fields
      tier: template.tier,
      display_name: template.display_name,
      description: template.description,
      features: template.features || [],
      is_popular: template.is_popular || false,
      usage_limits: template.usage_limits || {
        max_branches: 1,
        max_tables: 20,
        max_staff: 5,
        max_menu_items: 75,
      },
      pricing: template.pricing || {
        base_subscription_fee: 99900,
        transaction_fee_percentage: 2.0,
        currency: 'INR',
      },
      feature_access: template.feature_access || {
        qr_menu_ordering: true,
        digital_receipts: true,
        basic_pos: true,
        order_management: true,
        real_time_analytics: true,
        advanced_analytics: false,
        customer_crm: false,
        inventory_management: false,
        multi_location_management: false,
        priority_support: false,
        custom_integrations: false,
        api_access: false,
        white_label_options: false,
      },
      target_market: template.target_market,

      // Legacy for backward compatibility
      plan_metadata: {
        tier: template.tier,
        features: template.features?.join(','),
        display_name: template.display_name,
        is_popular: template.is_popular,
      },
    });
    setSelectedTemplate(template.id);
  };

  const handleDeletePlan = async (planId: string) => {
    if (confirm('Are you sure you want to delete this subscription plan?')) {
      try {
        await deletePlan(planId).unwrap();
        toast({
          title: 'Success',
          description: 'Subscription plan deleted successfully',
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: `Failed to delete plan: ${
            error.data?.message || error.message
          }`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleImportPlan = async () => {
    if (!importPlanId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid Cashfree Plan ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      await importPlan(importPlanId.trim()).unwrap();
      toast({
        title: 'Success',
        description: 'Plan imported successfully from Cashfree',
      });
      setIsImportDialogOpen(false);
      setImportPlanId('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to import plan: ${
          error.data?.message || error.message
        }`,
        variant: 'destructive',
      });
    }
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load subscription plans. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-muted-foreground">
            Manage Cashfree subscription plans for restaurants
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Import Existing Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Existing Plan</DialogTitle>
                <DialogDescription>
                  Import an existing plan from Cashfree by entering its Plan ID
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Cashfree Plan ID
                  </label>
                  <Input
                    placeholder="e.g., restohand_basic_starter_monthly"
                    value={importPlanId}
                    onChange={(e) => setImportPlanId(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the exact Plan ID from Cashfree dashboard
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setImportPlanId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportPlan}
                  disabled={importLoading || !importPlanId.trim()}
                >
                  {importLoading && (
                    <LoadingSpinner size="sm" className="mr-2" />
                  )}
                  Import Plan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Subscription Plan</DialogTitle>
                <DialogDescription>
                  Create a new Cashfree subscription plan for restaurants
                </DialogDescription>
              </DialogHeader>

              {!templatesLoading && templates && templates.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">
                      📋 Recommended Plan Templates
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose from our market-researched pricing templates based
                      on competitive analysis
                    </p>
                    <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                      {templates.map((template: any) => (
                        <div
                          key={template.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedTemplate === template.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleUseTemplate(template)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-sm">
                                  {template.name}
                                </h5>
                                {template.is_popular && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <Star className="mr-1 h-3 w-3" />
                                    Popular
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {template.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="font-medium text-primary">
                                  {formatCurrency(
                                    template.plan_recurring_amount / 100
                                  )}
                                  <span className="text-muted-foreground">
                                    /{template.plan_interval_type.toLowerCase()}
                                  </span>
                                </span>
                                <span className="text-muted-foreground">
                                  {template.metadata?.target_segment}
                                </span>
                              </div>
                            </div>
                            <div className="ml-2">
                              {selectedTemplate === template.id ? (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-border"></div>
                              )}
                            </div>
                          </div>
                          {template.features && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {template.features
                                .slice(0, 3)
                                .map((feature: string, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs px-1 py-0"
                                  >
                                    {feature.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              {template.features.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-1 py-0"
                                >
                                  +{template.features.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">
                      🛠️ Custom Plan Configuration
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedTemplate
                        ? 'Customize the selected template or create from scratch'
                        : 'Create a custom plan with your own pricing and features'}
                    </p>
                  </div>
                </div>
              )}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="plan_name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Plan Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., restohand_professional_monthly"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select plan type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PERIODIC">Periodic</SelectItem>
                              <SelectItem value="ON_DEMAND">
                                On Demand
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (in ₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="599"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            {formatCurrency(field.value || 0)}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_max_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Amount (in ₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="599"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            {formatCurrency(field.value || 0)}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_intervals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intervals</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 1)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_interval_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="DAY">Day</SelectItem>
                              <SelectItem value="WEEK">Week</SelectItem>
                              <SelectItem value="MONTH">Month</SelectItem>
                              <SelectItem value="YEAR">Year</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_max_cycles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Cycles</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="999"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 12)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_note"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Professional plan with monthly billing at ₹999"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Metadata Fields */}
                    <FormField
                      control={form.control}
                      name="plan_metadata.tier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="professional">
                                Professional
                              </SelectItem>
                              <SelectItem value="enterprise">
                                Enterprise
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_metadata.display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Professional Growth"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_metadata.features"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Features (comma separated)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="qr_menu_ordering,digital_receipts,basic_pos,order_management"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter features separated by commas (e.g.,
                            qr_menu_ordering,digital_receipts)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plan_metadata.is_popular"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4"
                              />
                            </FormControl>
                            <FormLabel>Mark as Popular Plan</FormLabel>
                          </div>
                          <FormDescription>
                            Popular plans will be highlighted with a badge
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLoading}>
                      {createLoading && (
                        <LoadingSpinner size="sm" className="mr-2" />
                      )}
                      Create Plan
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Plans Grid */}
      {plans && plans.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan: any) => (
            <Card key={plan._id} className="relative">
              {plan.plan_metadata?.is_popular && (
                <Badge className="absolute -top-2 left-4 bg-gradient-to-r from-orange-400 to-pink-400">
                  <Star className="mr-1 h-3 w-3" />
                  Popular
                </Badge>
              )}

              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {plan.plan_metadata?.display_name || plan.plan_name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeletePlan(plan._id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>{plan.plan_note}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {formatCurrency(
                      (plan.plan_recurring_amount || plan.plan_amount) / 100
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    per{' '}
                    {formatInterval(
                      plan.plan_intervals,
                      plan.plan_interval_type
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span className="font-medium">Plan ID:</span>
                    <span className="ml-auto text-muted-foreground font-mono text-xs">
                      {plan.cashfree_plan_id || plan.plan_id}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Package className="mr-2 h-4 w-4" />
                    <span className="font-medium">Type:</span>
                    <span className="ml-auto">{plan.plan_type}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="font-medium">Max Cycles:</span>
                    <span className="ml-auto">{plan.plan_max_cycles}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span className="font-medium">Transaction Fee:</span>
                    <span className="ml-auto">
                      {plan.pricing?.transaction_fee_percentage || 2}%
                    </span>
                  </div>
                </div>

                {/* Business Model Usage Limits */}
                {plan.usage_limits && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Usage Limits:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Branches:</span>
                        <span className="font-mono">
                          {plan.usage_limits.max_branches === -1 ? '∞' : plan.usage_limits.max_branches}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tables:</span>
                        <span className="font-mono">
                          {plan.usage_limits.max_tables === -1 ? '∞' : plan.usage_limits.max_tables}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Staff:</span>
                        <span className="font-mono">
                          {plan.usage_limits.max_staff === -1 ? '∞' : plan.usage_limits.max_staff}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Menu Items:</span>
                        <span className="font-mono">
                          {plan.usage_limits.max_menu_items === -1 ? '∞' : plan.usage_limits.max_menu_items}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Model Pricing */}
                {plan.pricing && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Pricing Structure:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Base Subscription:</span>
                        <span className="font-mono">
                          {formatCurrency(plan.pricing.base_subscription_fee / 100)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction Fee:</span>
                        <span className="font-mono text-green-600">
                          {plan.pricing.transaction_fee_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {(plan.features || plan.plan_metadata?.features) && (
                  <div>
                    <div className="text-sm font-medium mb-2">Features:</div>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(plan.features)
                        ? plan.features
                        : (plan.plan_metadata?.features || '').split(',')
                      ).map((feature: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {feature.trim().replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional metadata display */}
                {(plan.tier || plan.metadata?.target_segment) && (
                  <div className="pt-2 border-t">
                    {plan.tier && (
                      <div className="flex items-center text-sm mb-1">
                        <span className="font-medium mr-2">Tier:</span>
                        <Badge variant="outline" className="capitalize">
                          {plan.tier}
                        </Badge>
                      </div>
                    )}
                    {plan.metadata?.target_segment && (
                      <div className="text-xs text-muted-foreground">
                        Target: {plan.metadata.target_segment}
                      </div>
                    )}
                    {plan.metadata?.key_benefit && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        💡 {plan.metadata.key_benefit}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge
                    variant={
                      plan.plan_status === 'ACTIVE' ? 'default' : 'secondary'
                    }
                  >
                    {plan.plan_status}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No subscription plans</h3>
                <p className="text-muted-foreground">
                  Get started by creating your first subscription plan
                </p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionPlansPage;
