import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Receipt,
  CheckCircle2,
  Info,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetRestaurantQuery,
  useUpdateRestaurantMutation,
} from '@/store/api/restaurantsApi';
import { cn } from '@/lib/utils';

export enum RestaurantType {
  STANDALONE = 'standalone',
  HOTEL_UNDER_7500 = 'hotel_under_7500',
  HOTEL_ABOVE_7500 = 'hotel_above_7500',
  CATERING_STANDALONE = 'catering_standalone',
  CATERING_PREMIUM = 'catering_premium',
}

// Step 1 schema - only validate fields needed for step 1
const step1Schema = z.object({
  establishmentType: z.nativeEnum(RestaurantType),
  roomTariff: z.number().min(0).optional(),
});

// Full schema for final submission
const gstSetupSchema = z.object({
  establishmentType: z.nativeEnum(RestaurantType),
  businessState: z.string().min(1, 'Please select your business state'),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/,
      'Invalid GSTIN format'
    )
    .optional()
    .or(z.literal('')),
  roomTariff: z.number().min(0).optional(),
  servesAlcohol: z.boolean(),
  enableServiceCharge: z.boolean(),
  serviceChargeRate: z.number().min(0).max(50).optional(),
  integratedWithDeliveryPlatforms: z.boolean(),
});

type GstSetupForm = z.infer<typeof gstSetupSchema>;

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh',
  'Dadra and Nagar Haveli',
  'Daman and Diu',
  'Lakshadweep',
  'Puducherry',
];

const ESTABLISHMENT_TYPES = [
  {
    value: RestaurantType.STANDALONE,
    label: 'Standalone Restaurant',
    description: 'Independent restaurants, cafes, dhabas, QSRs, cloud kitchens',
    gstRate: 5,
    canClaimITC: false,
    features: [
      'Simple compliance',
      'Lower tax rate',
      'Standard for food businesses',
    ],
  },
  {
    value: RestaurantType.HOTEL_UNDER_7500,
    label: 'Budget Hotel Restaurant',
    description: 'Restaurant within hotel (room tariff < ₹7,500/night)',
    gstRate: 5,
    canClaimITC: false,
    features: ['Budget hotel category', 'Lower tax rate', 'Simple compliance'],
  },
  {
    value: RestaurantType.HOTEL_ABOVE_7500,
    label: 'Premium Hotel Restaurant',
    description: 'Restaurant within luxury hotel (room tariff ≥ ₹7,500/night)',
    gstRate: 18,
    canClaimITC: true,
    features: [
      'Premium hotel category',
      'Input Tax Credit eligible',
      'Claim GST on purchases',
    ],
  },
  {
    value: RestaurantType.CATERING_STANDALONE,
    label: 'Catering Services',
    description: 'Independent catering and event services',
    gstRate: 5,
    canClaimITC: false,
    features: ['Event catering', 'Independent services', 'Simple compliance'],
  },
  {
    value: RestaurantType.CATERING_PREMIUM,
    label: 'Premium Catering Services',
    description: 'Premium catering within hotels or with venue rental',
    gstRate: 18,
    canClaimITC: true,
    features: [
      'Premium catering',
      'Input Tax Credit eligible',
      'Venue-based services',
    ],
  },
];

const GstSetupWizard = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { data: restaurant } = useGetRestaurantQuery(restaurantId!, {
    skip: !restaurantId,
  });
  const [updateRestaurant, { isLoading: isUpdating }] =
    useUpdateRestaurantMutation();

  // Step 1 form - only validates step 1 fields
  const step1Form = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      establishmentType: RestaurantType.STANDALONE,
      roomTariff: undefined,
    },
  });

  // Full form for step 2 and final submission
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<GstSetupForm>({
    resolver: zodResolver(gstSetupSchema),
    defaultValues: {
      establishmentType: RestaurantType.STANDALONE,
      businessState: restaurant?.address?.state || '',
      gstin: '',
      roomTariff: undefined,
      servesAlcohol: false,
      enableServiceCharge: false,
      serviceChargeRate: undefined,
      integratedWithDeliveryPlatforms: false,
    },
  });

  // Watch step 1 form values
  const step1EstablishmentType = step1Form.watch('establishmentType');
  const step1RoomTariff = step1Form.watch('roomTariff');

  // Watch full form values (for step 2)
  const establishmentType = watch('establishmentType');
  const businessState = watch('businessState');
  const servesAlcohol = watch('servesAlcohol');
  const enableServiceCharge = watch('enableServiceCharge');
  const roomTariff = watch('roomTariff');

  // Debug logging on form state changes
  console.log('🔥 CURRENT FORM STATE:');
  console.log('🔥 Step:', step);
  console.log('🔥 Step1 Establishment Type:', step1EstablishmentType);
  console.log('🔥 Full Establishment Type:', establishmentType);
  console.log('🔥 Step1 Errors:', step1Form.formState.errors);
  console.log('🔥 Full Errors:', errors);
  console.log('🔥 Restaurant ID:', restaurantId);

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const getEstablishmentConfig = (type: RestaurantType) => {
    return (
      ESTABLISHMENT_TYPES.find((et) => et.value === type) ||
      ESTABLISHMENT_TYPES[0]
    );
  };

  const selectedConfig = getEstablishmentConfig(step === 1 ? step1EstablishmentType : establishmentType);

  const onStep1Submit = (data: any) => {
    console.log('🔥 STEP 1 SUBMIT CALLED');
    console.log('🔥 Form data:', data);
    console.log('🔥 Current establishment type:', step1EstablishmentType);
    console.log('🔥 Current step:', step);
    console.log('🔥 Room tariff:', step1RoomTariff);
    console.log('🔥 Form errors:', step1Form.formState.errors);

    // Transfer step 1 data to main form
    setValue('establishmentType', data.establishmentType);
    if (data.roomTariff !== undefined) {
      setValue('roomTariff', data.roomTariff);
    }

    console.log('🔥 Moving to step 2...');
    setStep(2);
    console.log('🔥 Step should now be 2');
  };

  const onFinalSubmit = async (data: GstSetupForm) => {
    try {
      setValidationErrors([]);
      const config = getEstablishmentConfig(data.establishmentType);

      if (
        data.establishmentType === RestaurantType.HOTEL_ABOVE_7500 &&
        (!data.roomTariff || data.roomTariff < 7500)
      ) {
        setValidationErrors([
          'Room tariff must be ₹7,500 or above for premium hotel restaurants',
        ]);
        return;
      }
      if (
        data.establishmentType === RestaurantType.HOTEL_UNDER_7500 &&
        data.roomTariff &&
        data.roomTariff >= 7500
      ) {
        setValidationErrors([
          'Room tariff must be less than ₹7,500 for budget hotel restaurants',
        ]);
        return;
      }

      await updateRestaurant({
        id: restaurantId!,
        body: {
          businessDetails: {
            ...restaurant?.businessDetails,
            gst: {
              establishmentType: data.establishmentType,
              defaultGstRate: config.gstRate,
              canClaimITC: config.canClaimITC,
              businessState: data.businessState,
              gstin: data.gstin || undefined,
              roomTariff: data.roomTariff,
              servesAlcohol: data.servesAlcohol,
              enableServiceCharge: data.enableServiceCharge,
              serviceChargeRate: data.serviceChargeRate,
              integratedWithDeliveryPlatforms:
                data.integratedWithDeliveryPlatforms,
              isGstEnabled: true,
              configuredAt: new Date().toISOString(),
            },
          },
        } as any,
      }).unwrap();

      toast({
        title: 'GST Setup Complete!',
        description: `Your restaurant will charge ${config.gstRate}% GST on food items.`,
      });

      const fromOnboarding = location.pathname.includes('/settings/gst/setup');
      if (fromOnboarding) {
        navigate('/dashboard');
      } else {
        navigate('/settings/gst');
      }
    } catch (error) {
      toast({
        title: 'Setup failed',
        description: 'Please check your configuration and try again.',
        variant: 'destructive',
      });
    }
  };

  // Shared progress bar
  const ProgressBar = () => (
    <div className="flex items-center gap-2 mb-6">
      <div
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
          step >= 1
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {step > 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : '1'}
      </div>
      <div
        className={cn('h-px flex-1', step > 1 ? 'bg-primary' : 'bg-border')}
      />
      <div
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
          step >= 2
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        2
      </div>
    </div>
  );

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Receipt className="h-3.5 w-3.5" />
            <span>GST Configuration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Choose Your Restaurant Type
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select your business category to automatically configure the correct
            GST rate
          </p>
        </div>

        <ProgressBar />

        <Card>
          <CardContent className="pt-5 pb-5">
            <form
              onSubmit={(e) => {
                console.log('🔥 FORM SUBMIT EVENT TRIGGERED');
                console.log('🔥 Event:', e);
                step1Form.handleSubmit(onStep1Submit)(e);
              }}
              className="space-y-4"
            >
              <Label className="text-sm font-semibold">
                Restaurant Category
              </Label>

              <RadioGroup
                value={step1EstablishmentType}
                onValueChange={(value) =>
                  step1Form.setValue('establishmentType', value as RestaurantType)
                }
                className="grid gap-2"
              >
                {ESTABLISHMENT_TYPES.map((type) => (
                  <div key={type.value} className="relative">
                    <RadioGroupItem
                      value={type.value}
                      id={type.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.value}
                      className={cn(
                        'flex cursor-pointer rounded-lg border-2 p-3 transition-all hover:bg-accent/50',
                        'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                      )}
                    >
                      {/* Top row: name + badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="font-medium text-sm">
                            {type.label}
                          </span>
                          <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                            {type.gstRate}% GST
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {type.description}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {type.features.map((feature, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 text-xs text-muted-foreground"
                            >
                              <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {/* Room Tariff - only for hotel types */}
              {(step1EstablishmentType === RestaurantType.HOTEL_UNDER_7500 ||
                step1EstablishmentType === RestaurantType.HOTEL_ABOVE_7500) && (
                <div className="space-y-1.5">
                  <Label htmlFor="roomTariff" className="text-sm">
                    Room Tariff (per night){' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...step1Form.register('roomTariff', { valueAsNumber: true })}
                    type="number"
                    placeholder="Enter room tariff in rupees"
                    className="font-mono h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    {step1EstablishmentType === RestaurantType.HOTEL_ABOVE_7500
                      ? 'Must be ₹7,500 or above for premium hotel category'
                      : 'Must be less than ₹7,500 for budget hotel category'}
                  </p>
                </div>
              )}

              {/* Info Alert */}
              <Alert className="py-3">
                <Info className="h-3.5 w-3.5" />
                <AlertTitle className="text-sm">
                  Selected Configuration
                </AlertTitle>
                <AlertDescription className="text-xs">
                  <strong>{selectedConfig.gstRate}% GST:</strong>{' '}
                  {selectedConfig.canClaimITC
                    ? 'Higher rate but you can claim Input Tax Credit on business purchases, reducing your net tax burden.'
                    : 'Lower rate with simpler compliance requirements.'}
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  onClick={() => console.log('🔥 CONTINUE BUTTON CLICKED')}
                >
                  Continue
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Building2 className="h-3.5 w-3.5" />
          <span>Business Details</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Complete Your GST Setup
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter your business location and registration details
        </p>
      </div>

      <ProgressBar />

      <Card>
        <CardContent className="pt-5 pb-5">
          <form onSubmit={handleSubmit(onFinalSubmit as any)} className="space-y-5">
            {/* Business State + GSTIN side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="businessState" className="text-sm">
                  Business State <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={businessState}
                  onValueChange={(value) => setValue('businessState', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.businessState && (
                  <p className="text-xs text-destructive">
                    {errors.businessState.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  For SGST/CGST vs IGST calculation
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gstin" className="text-sm">
                  GSTIN{' '}
                  <span className="text-muted-foreground text-xs font-normal">
                    (Optional)
                  </span>
                </Label>
                <Input
                  {...register('gstin')}
                  placeholder="29ABCDE1234F1Z5"
                  maxLength={15}
                  className="font-mono h-9"
                />
                {errors.gstin && (
                  <p className="text-xs text-destructive">
                    {errors.gstin.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  15-digit GST identification number
                </p>
              </div>
            </div>

            <Separator />

            {/* Additional Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                Additional Configuration
              </h3>

              <div className="space-y-3">
                {/* Alcohol */}
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      {...register('servesAlcohol')}
                      type="checkbox"
                      id="servesAlcohol"
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                    <Label
                      htmlFor="servesAlcohol"
                      className="text-sm font-medium cursor-pointer"
                    >
                      We serve alcoholic beverages
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5 mt-0.5">
                    Alcohol is taxed under State VAT, not GST
                  </p>
                </div>

                {/* Service Charge */}
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      {...register('enableServiceCharge')}
                      type="checkbox"
                      id="enableServiceCharge"
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                    <Label
                      htmlFor="enableServiceCharge"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Enable service charge on bills
                    </Label>
                  </div>
                  {enableServiceCharge && (
                    <div className="ml-5 mt-2 flex items-center gap-3">
                      <div className="space-y-1">
                        <Label
                          htmlFor="serviceChargeRate"
                          className="text-xs text-muted-foreground"
                        >
                          Rate (%)
                        </Label>
                        <Input
                          {...register('serviceChargeRate', {
                            valueAsNumber: true,
                          })}
                          type="number"
                          placeholder="10"
                          min="0"
                          max="50"
                          className="w-20 h-8 text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        GST is calculated on subtotal including service charge
                      </p>
                    </div>
                  )}
                </div>

                {/* Delivery Platforms */}
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      {...register('integratedWithDeliveryPlatforms')}
                      type="checkbox"
                      id="deliveryPlatforms"
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                    <Label
                      htmlFor="deliveryPlatforms"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Integrated with food delivery platforms (Zomato/Swiggy)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5 mt-0.5">
                    Platforms collect GST for online orders (except premium
                    hotels)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive" className="py-3">
                <AlertTitle className="text-sm">
                  Configuration Issues
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary */}
            <Alert className="border-primary/50 bg-primary/5 py-3">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <AlertTitle className="text-sm">Configuration Summary</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">Type:</span>
                    <span>{selectedConfig.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">
                      Alcohol:
                    </span>
                    <span>{servesAlcohol ? 'Yes (State VAT)' : 'No'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">
                      GST Rate:
                    </span>
                    <span>{selectedConfig.gstRate}% on food items</span>
                  </div>
                  {enableServiceCharge && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">
                        Service Charge:
                      </span>
                      <span>{watch('serviceChargeRate') || 0}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">ITC:</span>
                    <span>
                      {selectedConfig.canClaimITC ? 'Eligible' : 'Not eligible'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">
                      Delivery:
                    </span>
                    <span>
                      {watch('integratedWithDeliveryPlatforms')
                        ? 'Integrated'
                        : 'None'}
                    </span>
                  </div>
                  {roomTariff && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">
                        Room Tariff:
                      </span>
                      <span>₹{roomTariff.toLocaleString()}/night</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-primary/20">
                  <strong>Note:</strong> Fresh items (vegetables, fruits) are
                  GST exempt.
                </p>
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Button>
              <Button type="submit" disabled={isUpdating} size="sm">
                {isUpdating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-1.5" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GstSetupWizard;
