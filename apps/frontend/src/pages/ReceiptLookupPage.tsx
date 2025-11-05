import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Receipt,
  Search,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export default function ReceiptLookupPage() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber.trim()) {
      return;
    }

    setIsSearching(true);

    // Navigate to receipt page
    navigate(`/receipts/${orderNumber.trim()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto mt-20 space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Receipt className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Receipt Lookup</h1>
          </div>
          <p className="text-muted-foreground">
            Enter your order number to view and download your receipt
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Your Receipt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="orderNumber" className="text-sm font-medium">Order Number</label>
                <Input
                  id="orderNumber"
                  placeholder="Enter order number (e.g., ORD-1234)"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="text-center font-mono text-lg"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={!orderNumber.trim() || isSearching}
              >
                {isSearching ? (
                  'Searching...'
                ) : (
                  <>
                    View Receipt
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">Need help finding your order number?</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Check your payment confirmation SMS/email</li>
                  <li>• Look for the order number on your table receipt</li>
                  <li>• Ask restaurant staff for assistance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Order numbers typically look like: ORD-123456ABC001
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-8">
          <p className="text-xs text-muted-foreground">
            Powered by RestoHand
          </p>
        </div>
      </motion.div>
    </div>
  );
}