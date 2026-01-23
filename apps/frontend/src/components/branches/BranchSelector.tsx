import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Check } from 'lucide-react';
import { useBranchContext } from '@/contexts/BranchContext';
import { cn } from '@/lib/utils';

interface BranchSelectorProps {
  className?: string;
  compact?: boolean;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({
  className,
  compact = false
}) => {
  const {
    branches,
    currentBranch,
    isMultiBranch,
    isLoading,
    switchBranch,
    canAccessAllBranches,
  } = useBranchContext();

  // Don't show selector if not multi-branch or user can't switch
  if (!isMultiBranch || !canAccessAllBranches) {
    return compact ? null : (
      <div className={cn('flex items-center gap-2', className)}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {currentBranch?.name || 'Loading...'}
        </span>
        {currentBranch?.isMainBranch && (
          <Badge variant="secondary" className="text-xs">
            Main
          </Badge>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading branches...</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!compact && (
        <Building2 className="h-4 w-4 text-muted-foreground" />
      )}

      <Select
        value={currentBranch?._id || ''}
        onValueChange={switchBranch}
      >
        <SelectTrigger className={cn(
          'h-auto p-2 border-0 shadow-none bg-transparent hover:bg-accent',
          compact ? 'w-auto min-w-[120px]' : 'min-w-[180px]'
        )}>
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {currentBranch?.name || 'Select Branch'}
              </span>
              {currentBranch?.isMainBranch && (
                <Badge variant="secondary" className="text-xs">
                  Main
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {branches.map((branch) => (
            <SelectItem
              key={branch._id}
              value={branch._id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div>
                  <div className="font-medium">{branch.name}</div>
                  {branch.address.city && (
                    <div className="text-xs text-muted-foreground">
                      {branch.address.city}, {branch.address.state}
                    </div>
                  )}
                </div>
                {branch.isMainBranch && (
                  <Badge variant="secondary" className="text-xs ml-2">
                    Main
                  </Badge>
                )}
              </div>
              {currentBranch?._id === branch._id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BranchSelector;