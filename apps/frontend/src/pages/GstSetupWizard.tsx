import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Receipt, CheckCircle } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetRestaurantQuery,
  useUpdateRestaurantMutation,
} from '@/store/api/restaurantsApi';

const gstSetupSchema = z.object({
  restaurantType: z.enum(['regular', 'premium']),
  businessState: z.string().min(1, 'Please select your business state'),
  gstin: z.string().optional(),
});

type GstSetupForm = z.infer<typeof gstSetupSchema>;

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu',
  'Lakshadweep', 'Puducherry'
];

const GstSetupWizard = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const { data: restaurant } = useGetRestaurantQuery(restaurantId!, {
    skip: !restaurantId,
  });
  const [updateRestaurant, { isLoading: isUpdating }] = useUpdateRestaurantMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<GstSetupForm>({
    resolver: zodResolver(gstSetupSchema),
    defaultValues: {
      restaurantType: 'regular',
      businessState: restaurant?.address?.state || '',
      gstin: '',
    },
  });

  const restaurantType = watch('restaurantType');

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const getGstRate = (type: string) => (type === 'premium' ? 18 : 5);
  const canClaimITC = (type: string) => type === 'premium';

  const onStep1Submit = () => {
    setStep(2);
  };

  const onFinalSubmit = async (data: GstSetupForm) => {
    try {
      const gstRate = getGstRate(data.restaurantType);
      const establishmentType = data.restaurantType === 'premium' ? 'hotel_above_7500' : 'standalone';

      await updateRestaurant({
        id: restaurantId,
        body: {
          businessDetails: {
            ...restaurant?.businessDetails,
            gst: {
              establishmentType,
              defaultGstRate: gstRate,
              canClaimITC: canClaimITC(data.restaurantType),
              businessState: data.businessState,
              gstin: data.gstin || undefined,
            },
          },
        },
      }).unwrap();

      toast({
        title: 'GST Setup Complete!',
        description: `Your restaurant will charge ${gstRate}% GST on food items.`,
      });

      navigate('/settings/gst');
    } catch (error) {
      toast({
        title: 'Setup failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto py-8 max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Receipt className="h-5 w-5" />
                GST Setup
              </CardTitle>
              <CardDescription>
                Choose your restaurant type for automatic GST calculation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-6">
                <div>
                  <Label className="text-base font-medium">What type of restaurant are you?</Label>

                  <RadioGroup
                    value={restaurantType}
                    onValueChange={(value) => setValue('restaurantType', value as any)}
                    className="grid grid-cols-1 gap-4 mt-4"
                  >
                    <div className="relative">
                      <RadioGroupItem
                        value="regular"
                        id="regular"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="regular"
                        className="flex flex-col p-4 bg-card border-2 rounded-lg cursor-pointer hover:bg-accent/50 peer-checked:border-primary peer-checked:bg-primary/5"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium">Regular Restaurant</div>
                          <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            5% GST
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Most restaurants, dhabas, cafes, street food
                        </div>
                      </Label>
                    </div>

                    <div className="relative">
                      <RadioGroupItem
                        value="premium"
                        id="premium"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="premium"
                        className="flex flex-col p-4 bg-card border-2 rounded-lg cursor-pointer hover:bg-accent/50 peer-checked:border-primary peer-checked:bg-primary/5"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium">Premium Restaurant</div>
                          <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            18% GST
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Fine dining, 5-star hotels, premium establishments
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {restaurantType === 'premium' ? (
                        <span><strong>18% GST</strong> - You can claim Input Tax Credit on business purchases</span>
                      ) : (
                        <span><strong>5% GST</strong> - Simple compliance, no ITC claims</span>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    Next: Business Details
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Details
            </CardTitle>
            <CardDescription>
              Complete your GST setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onFinalSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="businessState">Business State *</Label>
                <select
                  {...register('businessState')}
                  className="w-full p-2 border border-input rounded-md bg-background mt-1"
                >
                  <option value="">Select your state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.businessState && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.businessState.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="gstin">GSTIN (Optional)</Label>
                <Input
                  {...register('gstin')}
                  placeholder="22AAAAA0000A1Z5"
                  className="mt-1"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter if you have GST registration
                </p>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Setup Summary:</strong><br />
                  • {getGstRate(restaurantType)}% GST on cooked food<br />
                  • 0% GST on fresh items<br />
                  • {canClaimITC(restaurantType) ? 'Can claim ITC' : 'Simple compliance'}<br />
                  • Automatic tax calculation
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? <LoadingSpinner size="sm" /> : 'Complete Setup'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GstSetupWizard;