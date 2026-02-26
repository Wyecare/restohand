import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Banknote,
  CreditCard,
  Smartphone,
  TrendingUp,
  Clock,
  User,
  Lock,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { useCloseTillMutation, useGetTillHistoryQuery, TillSession } from '@/store/api/tillApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useBranchContext } from '@/contexts/BranchContext';

interface TillViewProps {
  currentTill: TillSession | null;
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function TillView({ currentTill }: TillViewProps) {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const [closeTill, { isLoading: isClosing }] = useCloseTillMutation();

  const [showCloseDialog, setShowCloseDialog] = React.useState(false);
  const [closingCash, setClosingCash] = React.useState('');
  const [closingNotes, setClosingNotes] = React.useState('');

  const { data: history } = useGetTillHistoryQuery(
    { restaurantId: restaurantId!, branchId: currentBranch?._id, page: 1, limit: 10 },
    { skip: !restaurantId || !currentBranch?._id },
  );

  const handleCloseTill = async () => {
    if (!currentTill) return;
    try {
      await closeTill({
        restaurantId: restaurantId!,
        tillId: currentTill._id || currentTill.id,
        closingCash: parseFloat(closingCash) || 0,
        closingNotes: closingNotes || undefined,
      }).unwrap();
      toast({ title: 'Till closed successfully' });
      setShowCloseDialog(false);
      setClosingCash('');
      setClosingNotes('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to close till', description: err?.data?.message });
    }
  };

  const fmt = (n: number) => `₹${n.toFixed(2)}`;
  const fmtDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Till Management</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {currentBranch?.name ?? 'Current Branch'}
          </p>
        </div>
        {currentTill && (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-3 py-1">
            Till Open
          </Badge>
        )}
      </div>

      {currentTill ? (
        <>
          {/* Current Till Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Current Shift
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cashier</p>
                  <p className="font-semibold flex items-center gap-1 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                    {currentTill.cashierName ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Opened At</p>
                  <p className="font-semibold mt-0.5">{fmtDate(currentTill.openedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Opening Float</p>
                  <p className="font-semibold mt-0.5">{fmt(currentTill.openingFloat)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Orders Processed</p>
                  <p className="font-bold text-lg mt-0.5">{currentTill.transactions.orderCount}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  label="Cash"
                  value={fmt(currentTill.transactions.cashTotal)}
                  icon={Banknote}
                  color="bg-green-100 text-green-600"
                />
                <StatCard
                  label="Card"
                  value={fmt(currentTill.transactions.cardTotal)}
                  icon={CreditCard}
                  color="bg-blue-100 text-blue-600"
                />
                <StatCard
                  label="UPI"
                  value={fmt(currentTill.transactions.upiTotal)}
                  icon={Smartphone}
                  color="bg-purple-100 text-purple-600"
                />
                <StatCard
                  label="Total Collected"
                  value={fmt(currentTill.transactions.totalCollected)}
                  icon={TrendingUp}
                  color="bg-primary/10 text-primary"
                />
              </div>

              {currentTill.openingNotes && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <span className="font-medium">Opening Notes: </span>{currentTill.openingNotes}
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="destructive"
                  onClick={() => setShowCloseDialog(true)}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Close Till
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <Banknote className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">No till is currently open</p>
            <p className="text-sm text-muted-foreground">Open the till from the POS screen to start your shift.</p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history && history.sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            Recent Till Sessions
          </h3>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Opened</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Cashier</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Float</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Cash</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Card</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">UPI</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.sessions.map((s) => (
                  <tr key={s._id || s.id} className="hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{fmtDate(s.openedAt)}</td>
                    <td className="p-3 font-medium">{s.cashierName ?? '—'}</td>
                    <td className="p-3 text-right">{fmt(s.openingFloat)}</td>
                    <td className="p-3 text-right">{fmt(s.transactions.cashTotal)}</td>
                    <td className="p-3 text-right">{fmt(s.transactions.cardTotal)}</td>
                    <td className="p-3 text-right">{fmt(s.transactions.upiTotal)}</td>
                    <td className="p-3 text-right font-bold">{fmt(s.transactions.totalCollected)}</td>
                    <td className="p-3 text-center">
                      <Badge
                        className={s.status === 'open'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-muted text-muted-foreground'
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Close Till Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Close Till
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/50 p-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Opening Float</p>
                <p className="font-bold">{fmt(currentTill?.openingFloat ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expected Cash</p>
                <p className="font-bold">
                  {fmt((currentTill?.openingFloat ?? 0) + (currentTill?.transactions.cashTotal ?? 0))}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Actual Cash in Drawer (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="pl-7 h-11 text-base"
                  autoFocus
                />
              </div>
              {closingCash && currentTill && (
                <p className={`text-sm font-medium ${
                  parseFloat(closingCash) >= (currentTill.openingFloat + currentTill.transactions.cashTotal)
                    ? 'text-green-600' : 'text-amber-600'
                }`}>
                  Variance: ₹{(parseFloat(closingCash) - (currentTill.openingFloat + currentTill.transactions.cashTotal)).toFixed(2)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Closing Notes (optional)</Label>
              <Textarea
                placeholder="Any notes for this shift..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCloseDialog(false)} disabled={isClosing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCloseTill} disabled={isClosing || !closingCash}>
              {isClosing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Closing...</> : 'Close Till'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
