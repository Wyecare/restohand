import { useState, useEffect } from 'react';
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
  CATERING_PREMIUM = 'catering_premium'
}

const gstSetupSchema = z.object({
  establishmentType: z.nativeEnum(RestaurantType),
  businessState: z.string().min(1, 'Please select your business state'),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/, 'Invalid GSTIN format').optional().or(z.literal('')),
  roomTariff: z.number().min(0).optional(),
  servesAlcohol: z.boolean().default(false),
  enableServiceCharge: z.boolean().default(false),
  serviceChargeRate: z.number().min(0).max(50).optional(),
  integratedWithDeliveryPlatforms: z.boolean().default(false),
});

type GstSetupForm = z.infer<typeof gstSetupSchema>;

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh',
  'Dadra and Nagar Haveli', 'Daman and Diu', 'Lakshadweep', 'Puducherry'
];

const ESTABLISHMENT_TYPES = [
  {
    value: RestaurantType.STANDALONE,
    label: 'Standalone Restaurant',
    description: 'Independent restaurants, cafes, dhabas, QSRs, cloud kitchens',
    gstRate: 5,
    canClaimITC: false,
    features: ['Simple compliance', 'Lower tax rate', 'Standard for food businesses']
  },
  {
    value: RestaurantType.HOTEL_UNDER_7500,
    label: 'Budget Hotel Restaurant',
    description: 'Restaurant within hotel (room tariff < ₹7,500/night)',
    gstRate: 5,
    canClaimITC: false,
    features: ['Budget hotel category', 'Lower tax rate', 'Simple compliance']
  },
  {
    value: RestaurantType.HOTEL_ABOVE_7500,
    label: 'Premium Hotel Restaurant',
    description: 'Restaurant within luxury hotel (room tariff ≥ ₹7,500/night)',
    gstRate: 18,
    canClaimITC: true,
    features: ['Premium hotel category', 'Input Tax Credit eligible', 'Claim GST on purchases']
  },
  {
    value: RestaurantType.CATERING_STANDALONE,
    label: 'Catering Services',
    description: 'Independent catering and event services',
    gstRate: 5,
    canClaimITC: false,
    features: ['Event catering', 'Independent services', 'Simple compliance']
  },
  {
    value: RestaurantType.CATERING_PREMIUM,
    label: 'Premium Catering Services',
    description: 'Premium catering within hotels or with venue rental',
    gstRate: 18,
    canClaimITC: true,
    features: ['Premium catering', 'Input Tax Credit eligible', 'Venue-based services']
  }
];

const GstSetupWizard = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { data: restaurant } = useGetRestaurantQuery(restaurantId!, {
    skip: !restaurantId,
  });
  const [updateRestaurant, { isLoading: isUpdating }] =
    useUpdateRestaurantMutation();

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

  const establishmentType = watch('establishmentType');
  const businessState = watch('businessState');
  const servesAlcohol = watch('servesAlcohol');
  const enableServiceCharge = watch('enableServiceCharge');
  const roomTariff = watch('roomTariff');

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const getEstablishmentConfig = (type: RestaurantType) => {
    return ESTABLISHMENT_TYPES.find(et => et.value === type) || ESTABLISHMENT_TYPES[0];
  };

  const selectedConfig = getEstablishmentConfig(establishmentType);

  const onStep1Submit = () => {
    setStep(2);
  };

  const onFinalSubmit = async (data: GstSetupForm) => {
    try {
      setValidationErrors([]);
      const config = getEstablishmentConfig(data.establishmentType);

      // Validate room tariff for hotel types
      if (data.establishmentType === RestaurantType.HOTEL_ABOVE_7500 && (!data.roomTariff || data.roomTariff < 7500)) {
        setValidationErrors(['Room tariff must be ₹7,500 or above for premium hotel restaurants']);
        return;
      }
      if (data.establishmentType === RestaurantType.HOTEL_UNDER_7500 && data.roomTariff && data.roomTariff >= 7500) {
        setValidationErrors(['Room tariff must be less than ₹7,500 for budget hotel restaurants']);
        return;
      }

      await updateRestaurant({
        id: restaurantId,
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
              integratedWithDeliveryPlatforms: data.integratedWithDeliveryPlatforms,
              isGstEnabled: true,
            },
          },
        },
      }).unwrap();

      toast({
        title: 'GST Setup Complete!',
        description: `Your restaurant will charge ${config.gstRate}% GST on food items.`,
      });

      navigate('/settings/gst');
    } catch (error) {
      toast({
        title: 'Setup failed',
        description: 'Please check your configuration and try again.',
        variant: 'destructive',
      });
    }
  };

  if (step === 1) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt className="h-4 w-4" />
              <span>GST Configuration</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Choose Your Restaurant Type
            </h1>
            <p className="text-muted-foreground">
              Select your business category to automatically configure the
              correct GST rate
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              1
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
              2
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form
                onSubmit={handleSubmit(onStep1Submit)}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Restaurant Category
                  </Label>

                  <RadioGroup
                    value={establishmentType}
                    onValueChange={(value) =>
                      setValue('establishmentType', value as RestaurantType)
                    }
                    className="grid gap-4"
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
                            'flex cursor-pointer flex-col gap-3 rounded-lg border-2 p-4 transition-all',
                            'hover:bg-accent/50',
                            'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold">
                                {type.label}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {type.description}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <div className="rounded-md bg-secondary px-2.5 py-1 text-sm font-semibold text-secondary-foreground">
                                {type.gstRate}% GST
                              </div>
                            </div>
                          </div>
                          <Separator />
                          <div className="space-y-1.5 text-sm">
                            {type.features.map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Room Tariff for Hotel Types */}
                {(establishmentType === RestaurantType.HOTEL_UNDER_7500 || establishmentType === RestaurantType.HOTEL_ABOVE_7500) && (
                  <div className="space-y-2">
                    <Label htmlFor="roomTariff">
                      Room Tariff (per night) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...register('roomTariff', { valueAsNumber: true })}
                      type="number"
                      placeholder="Enter room tariff in rupees"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      {establishmentType === RestaurantType.HOTEL_ABOVE_7500
                        ? 'Must be ₹7,500 or above for premium hotel category'
                        : 'Must be less than ₹7,500 for budget hotel category'
                      }
                    </p>
                  </div>
                )}

                {/* Info Alert */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Selected Configuration</AlertTitle>
                  <AlertDescription>
                    <span>
                      <strong>{selectedConfig.gstRate}% GST:</strong> {selectedConfig.canClaimITC
                        ? 'Higher rate but you can claim Input Tax Credit on business purchases, reducing your net tax burden.'
                        : 'Lower rate with simpler compliance requirements.'}
                    </span>
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
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
    <div className="container max-w-3xl py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>Business Details</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Complete Your GST Setup
          </h1>
          <p className="text-muted-foreground">
            Enter your business location and registration details
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="h-px flex-1 bg-primary" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            2
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onFinalSubmit)} className="space-y-6">
              {/* Business State */}
              <div className="space-y-2">
                <Label htmlFor="businessState">
                  Business State <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={businessState}
                  onValueChange={(value) => setValue('businessState', value)}
                >
                  <SelectTrigger>
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
                  <p className="text-sm text-destructive">
                    {errors.businessState.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Required for determining SGST/CGST or IGST on transactions
                </p>
              </div>

              <Separator />

              {/* GSTIN */}
              <div className="space-y-2">
                <Label htmlFor="gstin">
                  GSTIN{' '}
                  <span className="text-muted-foreground text-xs">
                    (Optional)
                  </span>
                </Label>
                <Input
                  {...register('gstin')}
                  placeholder="29ABCDE1234F1Z5"
                  maxLength={15}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  15-digit GST identification number (format: StateCode + PAN + EntityCode + CheckDigit)
                </p>
                {errors.gstin && (
                  <p className="text-sm text-destructive">
                    {errors.gstin.message}
                  </p>
                )}
              </div>

              <Separator />

              {/* Additional Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Configuration</h3>

                {/* Alcohol Service */}
                <div className="flex items-center space-x-2">
                  <input
                    {...register('servesAlcohol')}
                    type="checkbox"
                    id="servesAlcohol"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="servesAlcohol" className="text-sm font-medium">
                    We serve alcoholic beverages
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Alcohol is taxed under State VAT, not GST
                </p>

                {/* Service Charge */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      {...register('enableServiceCharge')}
                      type="checkbox"
                      id="enableServiceCharge"
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="enableServiceCharge" className="text-sm font-medium">
                      Enable service charge on bills
                    </Label>
                  </div>
                  {enableServiceCharge && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="serviceChargeRate" className="text-sm">
                        Service charge rate (%)
                      </Label>
                      <Input
                        {...register('serviceChargeRate', { valueAsNumber: true })}
                        type="number"
                        placeholder="10"
                        min="0"
                        max="50"
                        className="w-24"
                      />
                      <p className="text-xs text-muted-foreground">
                        GST will be calculated on subtotal including service charge
                      </p>
                    </div>
                  )}
                </div>

                {/* Delivery Integration */}
                <div className="flex items-center space-x-2">
                  <input
                    {...register('integratedWithDeliveryPlatforms')}
                    type="checkbox"
                    id="deliveryPlatforms"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="deliveryPlatforms" className="text-sm font-medium">
                    Integrated with food delivery platforms (Zomato/Swiggy)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Platforms collect GST for online orders (except premium hotels)
                </p>
              </div>

              <Separator />

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Configuration Issues</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary Alert */}
              <Alert className="border-primary/50 bg-primary/5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertTitle>Configuration Summary</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Type:</span>
                        <span>{selectedConfig.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">GST Rate:</span>
                        <span>{selectedConfig.gstRate}% on food items</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">ITC Eligibility:</span>
                        <span>
                          {selectedConfig.canClaimITC
                            ? 'Yes - Can claim input credits'
                            : 'No - Simple compliance'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {roomTariff && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Room Tariff:</span>
                          <span>₹{roomTariff.toLocaleString()}/night</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Alcohol Service:</span>
                        <span>{servesAlcohol ? 'Yes (State VAT)' : 'No'}</span>
                      </div>
                      {enableServiceCharge && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Service Charge:</span>
                          <span>{watch('serviceChargeRate') || 0}%</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Delivery Integration:</span>
                        <span>{watch('integratedWithDeliveryPlatforms') ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground">
                      <strong>Note:</strong> Fresh items (vegetables, fruits) are exempt from GST.
                      GST is calculated on subtotal {enableServiceCharge ? 'including service charge' : ''}.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={isUpdating} size="lg">
                  {isUpdating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  )}
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
