import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Receipt,
  Settings2,
  CheckCircle2,
  Info,
  Edit,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useGetRestaurantQuery } from '@/store/api/restaurantsApi';

interface FoodCategoryRule {
  category: string;
  description: string;
  hsnCode: string;
  gstRate: number | string;
  exemptFromGst: boolean;
  examples: string[];
}

const FOOD_CATEGORIES: FoodCategoryRule[] = [
  {
    category: 'Restaurant Food',
    description: 'All restaurant prepared and served food items',
    hsnCode: '9954',
    gstRate: 'Restaurant Default',
    exemptFromGst: false,
    examples: ['Cooked meals', 'Prepared dishes', 'Restaurant service'],
  },
  {
    category: 'Fresh Items',
    description: 'Fresh vegetables, fruits, and unprocessed items',
    hsnCode: '0701',
    gstRate: 0,
    exemptFromGst: true,
    examples: ['Fresh vegetables', 'Fruits', 'Unprocessed items'],
  },
  {
    category: 'Beverages (Non-Alcoholic)',
    description: 'Coffee, tea, and other non-alcoholic drinks served in restaurant',
    hsnCode: '2202',
    gstRate: 'Restaurant Default',
    exemptFromGst: false,
    examples: ['Coffee', 'Tea', 'Fresh juices', 'Soft drinks'],
  },
  {
    category: 'Alcoholic Beverages',
    description: 'Alcoholic drinks (State VAT applies, not GST)',
    hsnCode: '2208',
    gstRate: 'State VAT',
    exemptFromGst: true,
    examples: ['Beer', 'Wine', 'Spirits', 'Cocktails'],
  },
  {
    category: 'Service Charge',
    description: 'Optional service charge added to bills',
    hsnCode: 'N/A',
    gstRate: 'Included in GST calculation',
    exemptFromGst: false,
    examples: ['Service charge', 'Gratuity', 'Service fees'],
  },
];

const getEstablishmentTypeDisplay = (type: string) => {
  const types = {
    'standalone': 'Standalone Restaurant',
    'hotel_under_7500': 'Budget Hotel Restaurant',
    'hotel_above_7500': 'Premium Hotel Restaurant',
    'catering_standalone': 'Catering Services',
    'catering_premium': 'Premium Catering Services'
  };
  return types[type as keyof typeof types] || 'Restaurant';
};

const SimpleGstSettingsPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const navigate = useNavigate();
  const { data: restaurant, isLoading } = useGetRestaurantQuery(restaurantId!, {
    skip: !restaurantId
  });

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const gstConfig = restaurant?.businessDetails?.gst;

  if (!gstConfig) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Tax & GST Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your GST settings for compliant invoicing
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Info className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>GST Not Configured</CardTitle>
                <CardDescription>
                  Set up GST to enable tax calculations on your invoices
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/settings/gst/setup')}>
              <Settings2 className="h-4 w-4 mr-2" />
              Configure GST Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Tax & GST Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your GST configuration and tax rates
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/settings/gst/setup')}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Configuration
        </Button>
      </div>

      {/* Status Alert */}
      <Alert className="border-primary/50 bg-primary/5">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <AlertTitle>GST Configuration Active</AlertTitle>
        <AlertDescription>
          Your GST is configured and tax calculations are applied automatically
          to all transactions
        </AlertDescription>
      </Alert>

      {/* Current Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Current Configuration</CardTitle>
          </div>
          <CardDescription>
            Your business GST settings based on Indian tax regulations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Configuration */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Business Type */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Establishment Type
              </p>
              <Badge variant="outline" className="font-normal">
                {getEstablishmentTypeDisplay(gstConfig.establishmentType)}
              </Badge>
            </div>

            {/* Default GST Rate */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                GST Rate
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-semibold">
                  {gstConfig.defaultGstRate}% GST
                </Badge>
                {gstConfig.canClaimITC && (
                  <Badge
                    variant="outline"
                    className="text-xs border-primary text-primary"
                  >
                    ITC Eligible
                  </Badge>
                )}
              </div>
            </div>

            {/* Business State */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Business State
              </p>
              <p className="text-sm font-medium">{gstConfig.businessState}</p>
            </div>
          </div>

          {/* Additional Configuration */}
          {(gstConfig.roomTariff || gstConfig.servesAlcohol || gstConfig.enableServiceCharge || gstConfig.integratedWithDeliveryPlatforms) && (
            <>
              <Separator />
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Room Tariff */}
                {gstConfig.roomTariff && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Room Tariff (per night)
                    </p>
                    <p className="text-sm font-medium">
                      ₹{gstConfig.roomTariff.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Service Charge */}
                {gstConfig.enableServiceCharge && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Service Charge
                    </p>
                    <Badge variant="outline">
                      {gstConfig.serviceChargeRate || 0}% enabled
                    </Badge>
                  </div>
                )}

                {/* Alcohol Service */}
                {gstConfig.servesAlcohol && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Alcoholic Beverages
                    </p>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      State VAT applies
                    </Badge>
                  </div>
                )}

                {/* Delivery Platforms */}
                {gstConfig.integratedWithDeliveryPlatforms && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Delivery Platforms
                    </p>
                    <Badge variant="outline" className="border-blue-500 text-blue-700">
                      Platform collects GST
                    </Badge>
                  </div>
                )}
              </div>
            </>
          )}

          {/* GSTIN */}
          {gstConfig.gstin && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  GSTIN
                </p>
                <p className="font-mono text-sm font-medium">
                  {gstConfig.gstin}
                </p>
              </div>
            </>
          )}

          {/* Configuration Timestamp */}
          {gstConfig.configuredAt && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground">
                Configured on {new Date(gstConfig.configuredAt).toLocaleDateString('en-IN')}
                {gstConfig.lastUpdatedAt && gstConfig.lastUpdatedAt !== gstConfig.configuredAt && (
                  <span> • Last updated on {new Date(gstConfig.lastUpdatedAt).toLocaleDateString('en-IN')}</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tax Application Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Tax Application Rules</CardTitle>
          </div>
          <CardDescription>
            How GST is automatically applied to different menu categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FOOD_CATEGORIES.map((category) => {
              let effectiveRate: string;
              if (category.gstRate === 'Restaurant Default') {
                effectiveRate = `${gstConfig.defaultGstRate}%`;
              } else if (category.gstRate === 'State VAT') {
                effectiveRate = 'State VAT';
              } else if (category.gstRate === 'Included in GST calculation') {
                effectiveRate = gstConfig.enableServiceCharge ? 'Taxable' : 'Not applicable';
              } else {
                effectiveRate = `${category.gstRate}%`;
              }

              // Hide service charge category if not enabled
              if (category.category === 'Service Charge' && !gstConfig.enableServiceCharge) {
                return null;
              }

              // Hide alcohol category if not serving alcohol
              if (category.category === 'Alcoholic Beverages' && !gstConfig.servesAlcohol) {
                return null;
              }

              return (
                <Card key={category.category} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {category.category}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          HSN: {category.hsnCode}
                        </p>
                      </div>
                      <Badge
                        variant={
                          category.exemptFromGst ? 'secondary' : 'default'
                        }
                        className="shrink-0"
                      >
                        {category.exemptFromGst ? 'Exempt' : effectiveRate}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Examples:
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {category.examples.slice(0, 3).join(', ')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ITC Information */}
      {gstConfig.canClaimITC && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Input Tax Credit (ITC)</CardTitle>
            </div>
            <CardDescription>
              Reduce your GST liability by claiming credits on business
              purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">ITC Eligible</p>
                  <p className="text-sm text-muted-foreground">
                    As an 18% GST establishment, you can claim credit for GST
                    paid on business purchases like raw materials, equipment,
                    and services. This reduces your net GST payment to the
                    government.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleGstSettingsPage;
