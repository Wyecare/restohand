import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from '@/store/api/restaurantsApi';
import type { MenuCategory } from '@/store/api/types';

const schema = z.object({
  name: z.string().min(2, 'Category name is required'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

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
  const [createCategory, { isLoading: creating }] =
    useCreateMenuCategoryMutation();
  const [updateCategory, { isLoading: updating }] =
    useUpdateMenuCategoryMutation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editingCategory?.name ?? '',
      description: editingCategory?.description ?? '',
    },
  });

  const allSuggestions = [
    ...getCategorySuggestions(),
    ...categories.map((c) => c.name),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const onSubmit = async (data: FormData) => {
    try {
      if (editingCategory) {
        await updateCategory({
          restaurantId,
          categoryId: editingCategory.id,
          body: {
            name: data.name,
            description: data.description,
            isActive: true,
          },
        }).unwrap();
        toast({
          title: 'Category updated',
          description: `${data.name} updated successfully.`,
        });
      } else {
        await createCategory({
          restaurantId,
          body: { ...data, displayOrder: categories.length, isActive: true },
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
        title: 'Error',
        description: 'Failed to save category. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? 'Edit Category' : 'New Category'}
          </DialogTitle>
          <DialogDescription>
            {editingCategory
              ? 'Update details for this category.'
              : 'Create a new category to organize your dishes.'}
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
                      onValueChange={(v) => form.setValue('name', v)}
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
