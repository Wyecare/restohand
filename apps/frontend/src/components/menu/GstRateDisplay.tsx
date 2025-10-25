import { Badge } from '@/components/ui/badge';
import { Info, Inheritance } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PREDEFINED_GST_RATES, formatGstBreakdown } from '@/lib/gst-rates';

interface GstRateDisplayProps {
  gstRate?: number;
  isInherited?: boolean;
  categoryName?: string;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
}

export function GstRateDisplay({
  gstRate,
  isInherited = false,
  categoryName,
  size = 'sm',
  showBreakdown = false,
}: GstRateDisplayProps) {
  if (!gstRate) return null;

  const predefinedRate = PREDEFINED_GST_RATES.find(r => r.totalGstRate === gstRate);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const badgeVariant = isInherited ? 'outline' : 'secondary';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className={`${sizeClasses[size]} flex items-center gap-1`}>
            {isInherited && <Inheritance className="h-3 w-3" />}
            GST {gstRate}%
            <Info className="h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">GST Rate: {gstRate}%</p>
            {predefinedRate && (
              <>
                <p className="text-sm">{formatGstBreakdown(predefinedRate)}</p>
                <p className="text-sm text-muted-foreground">
                  Category: {predefinedRate.categoryType}
                </p>
              </>
            )}
            {isInherited && (
              <p className="text-xs text-muted-foreground">
                Inherited from category: {categoryName}
              </p>
            )}
            {showBreakdown && predefinedRate && (
              <div className="text-xs text-muted-foreground">
                Examples: {predefinedRate.examples.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}