import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppSelector } from '@/store/hooks';
import {
  ShoppingCart,
  CreditCard,
  User,
  MapPin,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/billing';
import { useToast } from '@/components/ui/use-toast';
import { useCartCalculation } from '@/hooks/useCartCalculation';
import CartSummary from './CartSummary';

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaceOrder: (orderData: OrderFormData) => void;
  isLoading?: boolean;
  defaultTableNumber?: string;
}

export interface OrderFormData {
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  tableNumber?: string;
  notes?: string;
  paymentMethod: 'razorpay' | 'cash';
}

export default function CartDialog({
  open,
  onOpenChange,
  onPlaceOrder,
  isLoading = false,
  defaultTableNumber,
}: CartDialogProps) {
  const { toast } = useToast();
  const { totalQuantity, frontendTotal } = useAppSelector((state) => ({
    totalQuantity: state.cart.items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    ),
    frontendTotal: state.cart.total,
  }));

  const {
    isCalculating,
    backendTotal,
    backendSubtotal,
    taxBreakdown,
    hasBackendCalculation,
  } = useCartCalculation();

  // Use backend total if available, otherwise fall back to frontend calculation
  const displayTotal = hasBackendCalculation ? backendTotal : frontendTotal;

  const [activeTab, setActiveTab] = useState('cart');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<OrderFormData>({
    customerInfo: {
      name: '',
      phone: '',
      email: '',
    },
    tableNumber: defaultTableNumber || '',
    notes: '',
    paymentMethod: 'razorpay',
  });

  // Update table number when defaultTableNumber changes
  useEffect(() => {
    if (defaultTableNumber) {
      setFormData((prev) => ({
        ...prev,
        tableNumber: defaultTableNumber,
      }));
    }
  }, [defaultTableNumber]);

  const handleInputChange = (field: string, value: string) => {
    // Clear any existing error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }

    if (field.startsWith('customerInfo.')) {
      const subField = field.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        customerInfo: {
          ...prev.customerInfo,
          [subField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate customer name
    if (!formData.customerInfo.name.trim()) {
      errors['customerInfo.name'] = 'Name is required';
    }

    // Validate phone
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!formData.customerInfo.phone.trim()) {
      errors['customerInfo.phone'] = 'Phone number is required';
    } else if (
      !phoneRegex.test(formData.customerInfo.phone.replace(/\D/g, ''))
    ) {
      errors['customerInfo.phone'] =
        'Please enter a valid 10-digit phone number';
    }

    // Validate email if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      formData.customerInfo.email &&
      !emailRegex.test(formData.customerInfo.email)
    ) {
      errors['customerInfo.email'] = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = () => {
    if (totalQuantity === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before placing an order.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: 'Please fix the errors',
        description: 'There are some validation errors in the form.',
        variant: 'destructive',
      });
      setActiveTab('details');
      return;
    }

    try {
      onPlaceOrder(formData);
    } catch (error) {
      toast({
        title: 'Failed to place order',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const isFormValid = () => {
    const valid =
      formData.customerInfo.name.trim() !== '' &&
      formData.customerInfo.phone.trim() !== '' &&
      totalQuantity > 0 &&
      Object.keys(formErrors).length === 0;

    return valid;
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-2 gap-0 flex flex-col">
        <DialogHeader className=" pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="h-5 w-5" />
            Your Order
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="pt-4 pb-2">
            <TabsList className="grid w-full grid-cols-3 h-11">
              <TabsTrigger
                value="cart"
                className="flex items-center gap-2 text-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span> ({totalQuantity})
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="flex items-center gap-2 text-sm"
              >
                <User className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger
                value="payment"
                className="flex items-center gap-2 text-sm"
              >
                <CreditCard className="h-4 w-4" />
                Payment
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <TabsContent value="cart" className="mt-0 h-full">
              <div className="px-6 pb-6">
                <CartSummary
                  onCheckout={() => handleTabChange('details')}
                  isLoading={isLoading}
                />
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-0 h-full">
              <div className=" pb-6 space-y-5">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-2 pt-0 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0 space-y-4 px-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Name *
                        </Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={formData.customerInfo.name}
                          onChange={(e) =>
                            handleInputChange(
                              'customerInfo.name',
                              e.target.value
                            )
                          }
                          className={
                            formErrors['customerInfo.name']
                              ? 'border-destructive'
                              : ''
                          }
                        />
                        {formErrors['customerInfo.name'] && (
                          <div className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {formErrors['customerInfo.name']}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">
                          Phone *
                        </Label>
                        <Input
                          id="phone"
                          placeholder="Your phone number"
                          value={formData.customerInfo.phone}
                          onChange={(e) =>
                            handleInputChange(
                              'customerInfo.phone',
                              e.target.value
                            )
                          }
                          className={
                            formErrors['customerInfo.phone']
                              ? 'border-destructive'
                              : ''
                          }
                        />
                        {formErrors['customerInfo.phone'] && (
                          <div className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {formErrors['customerInfo.phone']}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email{' '}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.customerInfo.email}
                        onChange={(e) =>
                          handleInputChange(
                            'customerInfo.email',
                            e.target.value
                          )
                        }
                        className={
                          formErrors['customerInfo.email']
                            ? 'border-destructive'
                            : ''
                        }
                      />
                      {formErrors['customerInfo.email'] && (
                        <div className="flex items-center gap-1.5 text-xs text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {formErrors['customerInfo.email']}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-none">
                  <CardHeader className="px-2 pt-0 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {defaultTableNumber
                        ? 'Table Information'
                        : 'Table / Delivery Information'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-0">
                    <div className="space-y-2">
                      <Label htmlFor="table" className="text-sm font-medium">
                        {defaultTableNumber
                          ? 'Table Number'
                          : 'Table Number / Takeaway Name'}
                      </Label>
                      <Input
                        id="table"
                        placeholder={
                          defaultTableNumber
                            ? `Table ${defaultTableNumber}`
                            : 'Table 5 or your takeaway name'
                        }
                        value={formData.tableNumber}
                        onChange={(e) =>
                          handleInputChange('tableNumber', e.target.value)
                        }
                        readOnly={!!defaultTableNumber}
                        className={defaultTableNumber ? 'bg-muted' : ''}
                      />
                      {defaultTableNumber && (
                        <p className="text-xs text-muted-foreground">
                          Table number detected from QR code
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-none">
                  <CardHeader className="px-2 pt-0 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Special Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-0">
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-medium">
                        Notes{' '}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special requests or dietary requirements..."
                        value={formData.notes}
                        onChange={(e) =>
                          handleInputChange('notes', e.target.value)
                        }
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-2">
                  <Button
                    onClick={() => handleTabChange('payment')}
                    disabled={!isFormValid()}
                    className="w-full h-11 font-medium"
                    size="lg"
                  >
                    Continue to Payment
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="mt-0 h-full">
              <div className="px-0 pb-6 space-y-5">
                <Card>
                  <CardHeader className="pb-3 px-2">
                    <CardTitle className="text-base font-semibold">
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Items ({totalQuantity})</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(
                            hasBackendCalculation
                              ? backendSubtotal
                              : displayTotal
                          )}
                        </span>
                      </div>

                      {hasBackendCalculation && (
                        <>
                          {taxBreakdown.cgstAmount > 0 && (
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <span>CGST</span>
                              <span>
                                {formatCurrency(taxBreakdown.cgstAmount)}
                              </span>
                            </div>
                          )}
                          {taxBreakdown.sgstAmount > 0 && (
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <span>SGST</span>
                              <span>
                                {formatCurrency(taxBreakdown.sgstAmount)}
                              </span>
                            </div>
                          )}
                          {taxBreakdown.igstAmount > 0 && (
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <span>IGST</span>
                              <span>
                                {formatCurrency(taxBreakdown.igstAmount)}
                              </span>
                            </div>
                          )}
                          {taxBreakdown.roundOffAmount !== 0 && (
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <span>Round Off</span>
                              <span>
                                {formatCurrency(taxBreakdown.roundOffAmount)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-base">Total</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(displayTotal)}
                        </span>
                      </div>
                      {hasBackendCalculation ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          Final amount calculated with accurate GST rates.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">
                          Final amount includes GST and any applicable charges.
                          Exact total will be confirmed before payment.
                        </p>
                      )}
                      {isCalculating && (
                        <p className="text-xs text-orange-600 mt-1.5 font-medium">
                          Calculating accurate total...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={
                          formData.paymentMethod === 'razorpay'
                            ? 'default'
                            : 'outline'
                        }
                        className="h-24 flex flex-col gap-1.5 p-4"
                        onClick={() =>
                          handleInputChange('paymentMethod', 'razorpay')
                        }
                      >
                        <CreditCard className="h-5 w-5" />
                        <span className="font-medium">Online Payment</span>
                        <span className="text-xs opacity-80">
                          UPI, Cards, Wallets
                        </span>
                      </Button>
                      <Button
                        variant={
                          formData.paymentMethod === 'cash'
                            ? 'default'
                            : 'outline'
                        }
                        className="h-24 flex flex-col gap-1.5 p-4"
                        onClick={() =>
                          handleInputChange('paymentMethod', 'cash')
                        }
                      >
                        <span className="text-xl">💵</span>
                        <span className="font-medium">Pay Later</span>
                        <span className="text-xs opacity-80">
                          Cash at restaurant
                        </span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleTabChange('details')}
                    className="flex-1 h-11"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={!isFormValid() || isLoading}
                    className="flex-1 h-11 font-semibold"
                  >
                    {isLoading
                      ? 'Processing...'
                      : formData.paymentMethod === 'razorpay'
                      ? 'Pay Now'
                      : 'Place Order'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
