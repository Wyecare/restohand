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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Receipt,
  Settings2,
  CheckCircle,
  Info,
  Edit
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetRestaurantQuery,
} from '@/store/api/restaurantsApi';

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
    category: 'Cooked Food',
    description: 'Restaurant prepared food items',
    hsnCode: '9954',
    gstRate: 'Restaurant Default',
    exemptFromGst: false,
    examples: ['Biryani', 'Curry', 'Pizza', 'Burger', 'Pasta']
  },
  {
    category: 'Fresh Items',
    description: 'Fresh vegetables, fruits, and unprocessed items',
    hsnCode: '0701',
    gstRate: 0,
    exemptFromGst: true,
    examples: ['Fresh vegetables', 'Fruits', 'Salad ingredients']
  },
  {
    category: 'Packaged Items',
    description: 'Branded and packaged food items',
    hsnCode: '2106',
    gstRate: 5,
    exemptFromGst: false,
    examples: ['Packaged snacks', 'Branded biscuits', 'Ready meals']
  },
  {
    category: 'Beverages',
    description: 'Non-alcoholic drinks and beverages',
    hsnCode: '2202',
    gstRate: 12,
    exemptFromGst: false,
    examples: ['Soft drinks', 'Juices', 'Coffee', 'Tea']
  },
  {
    category: 'Alcohol',
    description: 'Alcoholic beverages (State VAT applies)',
    hsnCode: '2208',
    gstRate: 'State VAT',
    exemptFromGst: true,
    examples: ['Beer', 'Wine', 'Spirits', 'Cocktails']
  },
  {
    category: 'Sweets',
    description: 'Sweets and confectionery items',
    hsnCode: '1704',
    gstRate: 5,
    exemptFromGst: false,
    examples: ['Mithai', 'Desserts', 'Chocolates']
  },
  {
    category: 'Ice Cream',
    description: 'Ice cream and frozen desserts',
    hsnCode: '2105',
    gstRate: 18,
    exemptFromGst: false,
    examples: ['Ice cream', 'Kulfi', 'Frozen desserts']
  }
];

const getEstablishmentTypeDisplay = (type: string) => {
  switch (type) {
    case 'standalone':
      return 'Standalone Restaurant';
    case 'hotel_under_7500':
      return 'Hotel Restaurant (Budget)';
    case 'hotel_above_7500':
      return 'Hotel Restaurant (Premium)';
    case 'catering':
      return 'Catering Services';
    default:
      return 'Restaurant';
  }
};

const SimpleGstSettingsPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const navigate = useNavigate();

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data: restaurant, isLoading } = useGetRestaurantQuery(restaurantId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  const gstConfig = restaurant?.businessDetails?.gst;

  if (!gstConfig) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            GST is not configured for your restaurant.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => navigate('/settings/gst/setup')}
            >
              Set up GST now
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">GST Configuration</h1>
          <p className="text-muted-foreground">
            Your restaurant's GST is configured and working automatically.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/settings/gst/setup')}
        >
          <Edit className="h-4 w-4 mr-2" />
          Modify Setup
        </Button>
      </div>

      {/* Current GST Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Your GST Setup
          </CardTitle>
          <CardDescription>
            Configured based on Indian GST regulations for your business type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Business Type</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {getEstablishmentTypeDisplay(gstConfig.establishmentType)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Default GST Rate</Label>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700">
                  {gstConfig.defaultGstRate}% GST
                </Badge>
                {gstConfig.canClaimITC && (
                  <Badge variant="secondary" className="text-xs">
                    ITC Eligible
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Business State</Label>
              <div>{gstConfig.businessState}</div>
            </div>

            {gstConfig.gstin && (
              <div className="space-y-2 md:col-span-3">
                <Label className="text-sm font-medium text-muted-foreground">GSTIN</Label>
                <div className="font-mono text-sm">{gstConfig.gstin}</div>
              </div>
            )}
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Automatic Tax Calculation:</strong> All your menu items will be taxed according to Indian GST rules.
              Fresh items get 0% GST, cooked food gets {gstConfig.defaultGstRate}% GST, and other categories follow standard rates.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Food Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            How GST is Applied to Your Menu
          </CardTitle>
          <CardDescription>
            We automatically categorize your menu items and apply the correct GST rate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FOOD_CATEGORIES.map((category) => {
              const effectiveRate = category.gstRate === 'Restaurant Default'
                ? `${gstConfig.defaultGstRate}%`
                : category.gstRate === 'State VAT'
                  ? 'State VAT'
                  : `${category.gstRate}%`;

              return (
                <div
                  key={category.category}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{category.category}</h4>
                      <p className="text-xs text-muted-foreground">
                        HSN: {category.hsnCode}
                      </p>
                    </div>
                    <Badge
                      variant={category.exemptFromGst ? "secondary" : "default"}
                      className="text-xs"
                    >
                      {category.exemptFromGst ? 'Exempt' : effectiveRate}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>

                  <div className="text-xs text-muted-foreground">
                    <strong>Examples:</strong> {category.examples.slice(0, 3).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ITC Information (if applicable) */}
      {gstConfig.canClaimITC && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Input Tax Credit (ITC)
            </CardTitle>
            <CardDescription>
              You can claim ITC on your business purchases to reduce GST liability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>ITC Benefits:</strong> As an 18% GST establishment, you can claim credit for GST paid on
                business purchases like raw materials, equipment, and services. This reduces your net GST payment
                to the government.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Simple Label component for this file
const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

export default SimpleGstSettingsPage;