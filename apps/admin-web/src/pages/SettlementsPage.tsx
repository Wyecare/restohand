import { useState } from 'react';
import {
  useGetPendingSettlementsQuery,
  useGetSettlementHistoryQuery,
  useCalculateSettlementMutation,
  useExecuteSettlementMutation,
} from '@/store/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DollarSign, Calculator, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const SettlementsPage = () => {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [settlementData, setSettlementData] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const { data: pendingSettlements, isLoading: loadingPending } = useGetPendingSettlementsQuery();
  const { data: settlementHistory, isLoading: loadingHistory } = useGetSettlementHistoryQuery({});
  const [calculateSettlement, { isLoading: calculating }] = useCalculateSettlementMutation();
  const [executeSettlement, { isLoading: executing }] = useExecuteSettlementMutation();

  const handleCalculateSettlement = async (restaurantId: string) => {
    try {
      const result = await calculateSettlement(restaurantId).unwrap();
      setSettlementData(result);
      setSelectedRestaurant(restaurantId);
      setShowConfirmDialog(true);
    } catch (error: any) {
      toast({
        title: 'Calculation failed',
        description: error.data?.message || 'Failed to calculate settlement',
        variant: 'destructive',
      });
    }
  };

  const handleExecuteSettlement = async () => {
    if (!selectedRestaurant || !settlementData) return;

    try {
      const result = await executeSettlement({
        restaurantId: selectedRestaurant,
        settlementData,
      }).unwrap();

      toast({
        title: 'Settlement executed',
        description: result.message,
      });

      setShowConfirmDialog(false);
      setSettlementData(null);
      setSelectedRestaurant(null);
    } catch (error: any) {
      toast({
        title: 'Execution failed',
        description: error.data?.message || 'Failed to execute settlement',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Settlements</h1>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Settlements
            {pendingSettlements && pendingSettlements.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingSettlements.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Settlement History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loadingPending ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : !pendingSettlements || pendingSettlements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-96">
                <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold">No pending settlements</h3>
                <p className="text-muted-foreground">All restaurants are up to date</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingSettlements.map((settlement) => (
                <Card key={settlement.restaurantId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          {settlement.restaurantName}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{settlement.orderCount} orders</span>
                          <span>₹{settlement.totalAmount.toLocaleString()}</span>
                          <span>
                            {new Date(settlement.oldestOrder).toLocaleDateString()} -{' '}
                            {new Date(settlement.latestOrder).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleCalculateSettlement(settlement.restaurantId)}
                        disabled={calculating}
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Calculate Settlement
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : !settlementHistory?.settlements || settlementHistory.settlements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-96">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No settlement history</h3>
                <p className="text-muted-foreground">Settlement records will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {settlementHistory.settlements.map((settlement) => (
                <Card key={settlement.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{settlement.restaurantName}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>₹{settlement.amount.toLocaleString()}</span>
                          <span>Commission: ₹{settlement.commission.toLocaleString()}</span>
                          <span>Net: ₹{settlement.netAmount.toLocaleString()}</span>
                          <span>{new Date(settlement.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          settlement.status === 'completed'
                            ? 'default'
                            : settlement.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {settlement.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Settlement Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Settlement</DialogTitle>
            <DialogDescription>
              Please review the settlement details before proceeding.
            </DialogDescription>
          </DialogHeader>

          {settlementData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Orders</p>
                  <p className="text-lg">{settlementData.orderCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Amount</p>
                  <p className="text-lg">₹{settlementData.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Commission</p>
                  <p className="text-lg">₹{settlementData.commission.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Net Settlement</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{settlementData.netAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteSettlement}
              disabled={executing}
            >
              {executing ? 'Processing...' : 'Execute Settlement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettlementsPage;