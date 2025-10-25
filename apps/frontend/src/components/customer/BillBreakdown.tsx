import { motion } from 'framer-motion';
import { Info, Gift, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BillBreakdown as BillBreakdownType,
  formatCurrency,
  getBillingSummary,
  getTaxInfo
} from '@/lib/billing';
import { useState } from 'react';

interface BillBreakdownProps {
  breakdown: BillBreakdownType;
  itemCount: number;
  isDelivery?: boolean;
  isDetailed?: boolean;
  className?: string;
}

export function BillBreakdown({
  breakdown,
  itemCount,
  isDelivery = false,
  isDetailed = false,
  className = '',
}: BillBreakdownProps) {
  const [showDetails, setShowDetails] = useState(isDetailed);
  const billingSummary = getBillingSummary(breakdown);
  const taxInfo = getTaxInfo();

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`space-y-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Bill Details</span>
        </div>
        {!isDetailed && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">
                {showDetails ? 'Hide' : 'View'} Details
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        )}
      </div>

      {/* Summary View */}
      {!showDetails && (
        <motion.div
          variants={itemVariants}
          className="space-y-2"
        >
          <div className="flex justify-between text-sm">
            <span>Item Total ({itemCount} items)</span>
            <span>{formatCurrency(breakdown.subtotal)}</span>
          </div>

          {(breakdown.cgst + breakdown.sgst + breakdown.igst) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                Taxes & Fees
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{taxInfo.description}</p>
                      <p>Rate: {taxInfo.rate}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
              <span>
                {formatCurrency(
                  breakdown.cgst +
                  breakdown.sgst +
                  breakdown.igst +
                  breakdown.serviceCharge +
                  breakdown.packagingFee +
                  breakdown.platformFee +
                  breakdown.deliveryFee
                )}
              </span>
            </div>
          )}

          {breakdown.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center gap-1">
                <Gift className="h-3 w-3" />
                Total Savings
              </span>
              <span>-{formatCurrency(breakdown.discount)}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Detailed View */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleContent>
          <motion.div
            variants={containerVariants}
            className="space-y-2"
          >
            {billingSummary.map((item, index) => (
              <motion.div
                key={item.label}
                variants={itemVariants}
                transition={{ delay: index * 0.1 }}
                className={`flex justify-between text-sm ${
                  item.isDiscount ? 'text-green-600' : ''
                }`}
              >
                <span className="flex items-center gap-1">
                  {item.label}
                  {item.label.includes('GST') && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{taxInfo.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {item.label === 'Service Charge (3%)' && (
                    <Badge variant="outline" className="text-xs ml-1">
                      Optional
                    </Badge>
                  )}
                  {item.isDiscount && <Gift className="h-3 w-3" />}
                </span>
                <span className="font-medium">
                  {item.isDiscount ? '-' : ''}
                  {formatCurrency(Math.abs(item.amount))}
                </span>
              </motion.div>
            ))}

            {breakdown.savings > 0 && (
              <motion.div
                variants={itemVariants}
                className="p-2 bg-green-50 border border-green-200 rounded-md"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-green-700 font-medium">
                    <Gift className="h-4 w-4" />
                    You're saving
                  </span>
                  <span className="text-green-700 font-bold">
                    {formatCurrency(breakdown.savings)}
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Total */}
      <motion.div
        variants={itemVariants}
        className="flex justify-between text-lg font-bold"
      >
        <span>Total Amount</span>
        <span>{formatCurrency(breakdown.total)}</span>
      </motion.div>

      {/* Footer Info */}
      <motion.div
        variants={itemVariants}
        className="text-xs text-muted-foreground"
      >
        <div className="flex items-center justify-between">
          <span>Inclusive of all taxes</span>
          {isDelivery && (
            <Badge variant="secondary" className="text-xs">
              Delivery Order
            </Badge>
          )}
        </div>
        {breakdown.cgst > 0 && (
          <p className="mt-1">
            GST: {taxInfo.taxType} @ {taxInfo.rate}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}