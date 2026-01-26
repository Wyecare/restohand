import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  useDeleteMenuCategoryMutation,
  useDeleteMenuItemMutation,
} from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { type: 'category' | 'item'; data: any } | null;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  target,
}: DeleteConfirmDialogProps) {
  const { toast } = useToast();
  const { user } = useJwtAuth();
  const restaurantId = user?.restaurantId;

  const [deleteCategory, { isLoading: isDeletingCategory }] = useDeleteMenuCategoryMutation();
  const [deleteMenuItem, { isLoading: isDeletingItem }] = useDeleteMenuItemMutation();

  const isDeleting = isDeletingCategory || isDeletingItem;

  const handleDelete = async () => {
    if (!target || !restaurantId) return;

    try {
      if (target.type === 'category') {
        await deleteCategory({
          restaurantId,
          categoryId: target.data._id || target.data.id,
        }).unwrap();
        toast({
          title: 'Deleted',
          description: 'Category deleted successfully',
        });
      } else {
        await deleteMenuItem({
          restaurantId,
          itemId: target.data.id,
        }).unwrap();
        toast({
          title: 'Deleted',
          description: 'Menu item deleted successfully',
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to delete',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.type === 'category' ? (
              <>
                Are you sure you want to delete the category "
                <strong>{target.data?.name}</strong>"? This action cannot be
                undone and will also delete all menu items in this category.
              </>
            ) : (
              <>
                Are you sure you want to delete the menu item "
                <strong>{target?.data?.name}</strong>"? This action cannot be
                undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
