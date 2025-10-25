import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMenuTranslation, useCommonTranslation } from '@/hooks/use-translation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { SimpleCombobox } from '@/components/ui/simple-combobox';
import { getCategorySuggestions } from '@/lib/kerala-menu-suggestions';
import {
  PREDEFINED_GST_RATES,
  getDefaultGstRateForCategory,
  formatGstRate,
  formatGstBreakdown,
  type GstRateOption
} from '@/lib/gst-rates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from '@/store/api/restaurantsApi';
import type { MenuCategory } from '@/store/api/types';

// Schema will be created inside component to access translations
type FormData = {
  name: string;
  description?: string;
  defaultGstRateId: string;
};

interface MenuCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  categories: MenuCategory[];
  editingCategory?: MenuCategory | null;
  onSuccess?: () => void;
}

export function MenuCategoryDialog({
  open,
  onOpenChange,
  restaurantId,
  categories,
  editingCategory,
  onSuccess,
}: MenuCategoryDialogProps) {
  const { toast } = useToast();
  const { t: tMenu } = useMenuTranslation();
  const { t: tCommon } = useCommonTranslation();
  const [createCategory, { isLoading: creating }] =
    useCreateMenuCategoryMutation();
  const [updateCategory, { isLoading: updating }] =
    useUpdateMenuCategoryMutation();

  // Create schema with translations
  const schema = z.object({
    name: z.string().min(2, tCommon('forms.required')),
    description: z.string().optional(),
    defaultGstRateId: z.string().min(1, tCommon('forms.selectOption')),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editingCategory?.name ?? '',
      description: editingCategory?.description ?? '',
      defaultGstRateId: editingCategory?.defaultGstRateId ?? '',
    },
  });

  const allSuggestions = [
    ...getCategorySuggestions(),
    ...categories.map((c) => c.name),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  // Smart GST rate auto-selection based on category name
  const handleCategoryNameChange = (name: string) => {
    form.setValue('name', name);

    // Only auto-select GST if not editing and no GST rate is selected
    if (!editingCategory && !form.getValues('defaultGstRateId')) {
      const suggestedGstRate = getDefaultGstRateForCategory(name);
      form.setValue('defaultGstRateId', suggestedGstRate.id);
    }
  };

  const selectedGstRate = PREDEFINED_GST_RATES.find(
    rate => rate.id === form.watch('defaultGstRateId')
  );

  const onSubmit = async (data: FormData) => {
    try {
      const selectedRate = PREDEFINED_GST_RATES.find(rate => rate.id === data.defaultGstRateId);
      if (!selectedRate) {
        toast({
          title: 'Error',
          description: 'Please select a valid GST rate.',
          variant: 'destructive',
        });
        return;
      }

      if (editingCategory) {
        await updateCategory({
          restaurantId,
          categoryId: editingCategory.id,
          body: {
            name: data.name,
            description: data.description,
            isActive: true,
            defaultGstRateId: data.defaultGstRateId,
            defaultGstRate: selectedRate.totalGstRate,
            gstCategoryType: selectedRate.categoryType,
          },
        }).unwrap();
        toast({
          title: 'Category updated',
          description: `${data.name} updated successfully.`,
        });
      } else {
        await createCategory({
          restaurantId,
          body: {
            ...data,
            displayOrder: categories.length,
            isActive: true,
            defaultGstRateId: data.defaultGstRateId,
            defaultGstRate: selectedRate.totalGstRate,
            gstCategoryType: selectedRate.categoryType,
          },
        }).unwrap();
        toast({
          title: 'Category added',
          description: `${data.name} created successfully.`,
        });
      }
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: tCommon('messages.error'),
        description: tCommon('messages.networkError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? tMenu('categories.edit') : tMenu('categories.create')}
          </DialogTitle>
          <DialogDescription>
            {editingCategory
              ? tMenu('categories.editDesc')
              : tMenu('categories.createDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name *</FormLabel>
                  <FormControl>
                    <SimpleCombobox
                      value={field.value}
                      onValueChange={handleCategoryNameChange}
                      suggestions={allSuggestions}
                      placeholder="e.g., Breakfast, Rice Items"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultGstRateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    GST Rate *
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Default GST rate for all items in this category.</p>
                          <p>Individual items can override this rate if needed.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GST rate" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREDEFINED_GST_RATES.map((rate) => (
                          <SelectItem key={rate.id} value={rate.id}>
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <div className="font-medium">
                                  {rate.totalGstRate}% - {rate.categoryType}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatGstBreakdown(rate)}
                                </div>
                              </div>
                              {rate.isCommon && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Common
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  {selectedGstRate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <div className="font-medium">{selectedGstRate.description}</div>
                      <div>Examples: {selectedGstRate.examples.slice(0, 3).join(', ')}</div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Short note about this category"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
