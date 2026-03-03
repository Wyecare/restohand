import { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Settings2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { ModifierFormDialog } from './ModifierFormDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useListMenuModifiersByBranchQuery } from '@/store/api/menuModifiersApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';
import type { MenuModifier } from '@/store/api/menuModifiersApi';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: number, currency: string = 'INR'): string {
  if (amount === 0) return 'Free';
  const symbol = currency === 'INR' ? '₹' : '$';
  return amount > 0 ? `+${symbol}${amount}` : `${symbol}${amount}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${accent}`} />
      <span className="text-sm font-bold text-slate-800">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ModifierSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-100 rounded w-32" />
          <div className="h-3 bg-slate-100 rounded w-48" />
        </div>
        <div className="h-7 w-16 bg-slate-100 rounded-full" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-slate-100 rounded-full w-20" />
        <div className="h-5 bg-slate-100 rounded-full w-16" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded w-24 mb-3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-slate-50 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  isFiltered,
  onAdd,
}: {
  isFiltered: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Settings2 className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-1">
        {isFiltered ? 'No modifiers match your search' : 'No modifiers yet'}
      </p>
      <p className="text-xs text-slate-400 max-w-xs mb-5">
        {isFiltered
          ? 'Try a different search term'
          : 'Create modifiers like toppings, sizes, or add-ons to customize your menu items'}
      </p>
      {!isFiltered && (
        <Button
          onClick={onAdd}
          className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add First Modifier
        </Button>
      )}
    </div>
  );
}

// ─── Modifier Card ────────────────────────────────────────────────────────────

interface ModifierCardProps {
  modifier: MenuModifier;
  onEdit: (m: MenuModifier) => void;
  onDelete: (m: MenuModifier) => void;
}

function ModifierCard({ modifier, onEdit, onDelete }: ModifierCardProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleOptions = showAll ? modifier.options : modifier.options.slice(0, 3);
  const hasMore = modifier.options.length > 3;

  const activeOptions = modifier.options.filter((o) => o.isAvailable && o.inStock).length;

  return (
    <div
      className={cn(
        'group relative bg-white rounded-xl border shadow-sm flex flex-col transition-shadow duration-150 hover:shadow-md overflow-hidden',
        modifier.isActive
          ? 'border-slate-200'
          : 'border-slate-100 opacity-60'
      )}
    >
      {/* Top accent bar — color by selection type */}
      <div
        className={cn(
          'h-0.5 w-full',
          modifier.selectionType === 'single' ? 'bg-blue-400' : 'bg-violet-400'
        )}
      />

      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {modifier.name}
              </h3>
              {modifier.isRequired && (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 ring-1 ring-red-200 px-1.5 py-0.5 rounded-full font-medium">
                  Required
                </span>
              )}
            </div>
            {modifier.description && (
              <p className="text-xs text-slate-400 line-clamp-1">
                {modifier.description}
              </p>
            )}
          </div>

          {/* Edit / Delete */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(modifier)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(modifier)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Type + Selection Rules */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ring-1',
              modifier.selectionType === 'single'
                ? 'bg-blue-50 text-blue-700 ring-blue-200'
                : 'bg-violet-50 text-violet-700 ring-violet-200'
            )}
          >
            <Layers className="h-3 w-3" />
            {modifier.selectionType === 'single' ? 'Single' : 'Multiple'}
          </span>

          <span className="text-xs text-slate-400">
            {modifier.minSelections}–{modifier.maxSelections} selections
          </span>

          {modifier.freeOptions > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full font-medium">
              {modifier.freeOptions} free
            </span>
          )}
          {!modifier.unique && (
            <span className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-500 ring-1 ring-slate-200 px-2 py-0.5 rounded-full font-medium">
              Qty
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-100" />

      {/* Options List */}
      <div className="p-4 pt-3 flex-1 space-y-1.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Options
          </span>
          <span className="text-xs text-slate-400">
            {activeOptions}/{modifier.options.length} available
          </span>
        </div>

        {visibleOptions.map((option) => {
          const unavailable = !option.isAvailable || !option.inStock;
          return (
            <div
              key={option.id}
              className={cn(
                'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs',
                unavailable ? 'bg-slate-50' : 'bg-slate-50/50'
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {unavailable ? (
                  <XCircle className="h-3 w-3 text-slate-300 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                )}
                <span
                  className={cn(
                    'truncate font-medium',
                    unavailable ? 'text-slate-400 line-through' : 'text-slate-700'
                  )}
                >
                  {option.name}
                </span>
                {!option.inStock && (
                  <span className="shrink-0 text-xs bg-red-50 text-red-500 px-1 rounded font-medium">
                    Out
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'shrink-0 ml-2 font-semibold tabular-nums',
                  option.priceAdjustment === 0
                    ? 'text-emerald-600'
                    : option.priceAdjustment > 0
                    ? 'text-slate-600'
                    : 'text-red-500'
                )}
              >
                {formatPrice(option.priceAdjustment, option.currency)}
              </span>
            </div>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 py-1.5 transition-colors"
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                showAll && 'rotate-180'
              )}
            />
            {showAll
              ? 'Show less'
              : `${modifier.options.length - 3} more option${modifier.options.length - 3 !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* Footer — Active Toggle */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {modifier.isActive ? (
            <ToggleRight className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />
          )}
          <span className="text-xs font-medium text-slate-500">
            {modifier.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <Switch checked={modifier.isActive} readOnly />
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ModifiersView() {
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isModifierDialogOpen, setIsModifierDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedModifier, setSelectedModifier] = useState<MenuModifier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'modifier'; data: MenuModifier } | null>(null);

  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const queryParams =
    restaurantId && branchId
      ? { restaurantId, branchId, search: search || undefined }
      : skipToken;

  const { data: modifiersData, isLoading, error } = useListMenuModifiersByBranchQuery(queryParams);
  const modifiers = modifiersData?.data || [];

  const handleAddModifier = () => {
    setSelectedModifier(null);
    setIsModifierDialogOpen(true);
  };

  const handleEditModifier = (modifier: MenuModifier) => {
    setSelectedModifier(modifier);
    setIsModifierDialogOpen(true);
  };

  const handleDeleteModifier = (modifier: MenuModifier) => {
    setDeleteTarget({ type: 'modifier', data: modifier });
    setIsDeleteDialogOpen(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Failed to load modifiers</p>
        <p className="text-xs text-slate-400 mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  const activeCount = modifiers.filter((m) => m.isActive).length;
  const requiredCount = modifiers.filter((m) => m.isRequired).length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="mx-auto px-4 py-6 space-y-5">

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Settings2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Menu</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Modifiers
            </h1>
          </div>
          <Button
            onClick={handleAddModifier}
            className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Modifier
          </Button>
        </div>

        {/* Stats + Search Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Stats pills — only shown when we have data */}
          {!isLoading && modifiers.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <StatPill label="total" value={modifiers.length} accent="bg-blue-400" />
              <StatPill label="active" value={activeCount} accent="bg-emerald-400" />
              <StatPill label="required" value={requiredCount} accent="bg-red-400" />
            </div>
          )}

          {/* Search — pushes to right on sm+ */}
          <div className="relative w-full sm:w-auto sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search modifiers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm w-full sm:w-56 bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Section Label */}
        {!isLoading && modifiers.length > 0 && (
          <SectionLabel>
            {search
              ? `Results for "${search}"`
              : `All Modifiers · ${modifiers.length}`}
          </SectionLabel>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <ModifierSkeleton key={i} />)
          ) : modifiers.length === 0 ? (
            <EmptyState isFiltered={!!search} onAdd={handleAddModifier} />
          ) : (
            modifiers.map((modifier) => (
              <ModifierCard
                key={modifier.id}
                modifier={modifier}
                onEdit={handleEditModifier}
                onDelete={handleDeleteModifier}
              />
            ))
          )}
        </div>

        {/* Helper tip */}
        {!isLoading && modifiers.length > 0 && (
          <p className="text-xs text-slate-400 text-center">
            Hover a card to edit or delete · Toggle active status directly on the card
          </p>
        )}
      </div>

      {/* Dialogs */}
      <ModifierFormDialog
        open={isModifierDialogOpen}
        onOpenChange={setIsModifierDialogOpen}
        modifier={selectedModifier}
      />
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        target={deleteTarget}
      />
    </div>
  );
}