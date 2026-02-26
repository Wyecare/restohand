import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Banknote, Loader2 } from 'lucide-react';
import { useOpenTillMutation } from '@/store/api/tillApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useBranchContext } from '@/contexts/BranchContext';

interface TillOpenModalProps {
  open: boolean;
  onOpened: () => void;
}

export function TillOpenModal({ open, onOpened }: TillOpenModalProps) {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const [openTill, { isLoading }] = useOpenTillMutation();

  const [float, setFloat] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const handleOpen = async () => {
    if (!restaurantId || !currentBranch?._id) return;
    const floatAmount = parseFloat(float) || 0;

    try {
      await openTill({
        restaurantId,
        branchId: currentBranch._id,
        openingFloat: floatAmount,
        openingNotes: notes || undefined,
      }).unwrap();

      toast({ title: 'Till opened', description: `Opening float: ₹${floatAmount.toFixed(2)}` });
      setFloat('');
      setNotes('');
      onOpened();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to open till',
        description: err?.data?.message ?? 'Something went wrong',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Banknote className="h-5 w-5 text-green-600" />
            Open Till
          </DialogTitle>
          <DialogDescription>
            Count your starting cash and enter the opening float to begin your shift.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
            <p className="text-sm font-medium">Branch</p>
            <p className="text-base">{currentBranch?.name ?? '—'}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="float" className="text-sm font-medium">
              Opening Float (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
              <Input
                id="float"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={float}
                onChange={(e) => setFloat(e.target.value)}
                className="pl-7 text-lg h-12"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the amount of cash in the till drawer before starting.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any notes for this shift..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <Button
          onClick={handleOpen}
          disabled={isLoading}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening Till...</>
          ) : (
            <><Banknote className="h-4 w-4 mr-2" /> Open Till {float ? `with ₹${parseFloat(float).toFixed(2)}` : ''}</>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
