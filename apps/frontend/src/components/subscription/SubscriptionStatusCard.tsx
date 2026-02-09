import React from 'react';

interface SubscriptionStatusCardProps {
  usage: {
    branches: {
      current: number;
      limit: number;
      unlimited: boolean;
      percentage: number;
    };
    tables: {
      current: number;
      limit: number;
      unlimited: boolean;
      percentage: number;
    };
    staff: {
      current: number;
      limit: number;
      unlimited: boolean;
      percentage: number;
    };
    menuItems: {
      current: number;
      limit: number;
      unlimited: boolean;
      percentage: number;
    };
  };
  plan: {
    tier: string;
    display_name: string;
  };
}

export const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({
  usage,
  plan,
}) => {
  const formatLimit = (limit: number, unlimited: boolean) => {
    return unlimited ? '∞' : limit.toString();
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 70) return 'bg-green-500';
    if (percentage < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const UsageBar: React.FC<{
    label: string;
    current: number;
    limit: number;
    unlimited: boolean;
    percentage: number;
  }> = ({ label, current, limit, unlimited, percentage }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {current} / {formatLimit(limit, unlimited)}
        </span>
      </div>
      {!unlimited && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {plan.display_name} Plan
          </h3>
          <p className="text-sm text-gray-500 capitalize">{plan.tier} tier</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Subscription Status</div>
          <div className="text-green-600 font-medium">Active</div>
        </div>
      </div>

      <div className="space-y-4">
        <UsageBar
          label="Branches"
          current={usage.branches.current}
          limit={usage.branches.limit}
          unlimited={usage.branches.unlimited}
          percentage={usage.branches.percentage}
        />

        <UsageBar
          label="Tables"
          current={usage.tables.current}
          limit={usage.tables.limit}
          unlimited={usage.tables.unlimited}
          percentage={usage.tables.percentage}
        />

        <UsageBar
          label="Staff Members"
          current={usage.staff.current}
          limit={usage.staff.limit}
          unlimited={usage.staff.unlimited}
          percentage={usage.staff.percentage}
        />

        <UsageBar
          label="Menu Items"
          current={usage.menuItems.current}
          limit={usage.menuItems.limit}
          unlimited={usage.menuItems.unlimited}
          percentage={usage.menuItems.percentage}
        />
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Need more capacity?</span>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Upgrade Plan →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatusCard;