import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateMenuItemForBranchMutation,
  useUpdateMenuItemMutation,
  useUploadMenuItemImageMutation,
} from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';

const menuItemFormSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  isAvailable: z.boolean().default(true),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

interface MenuItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem?: any;
  categoryId?: string;
}

export function MenuItemFormDialog({
  open,
  onOpenChange,
  menuItem,
  categoryId,
}: MenuItemFormDialogProps) {
  const { toast } = useToast();
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const [createMenuItem, { isLoading: isCreating }] = useCreateMenuItemForBranchMutation();
  const [updateMenuItem, { isLoading: isUpdating }] = useUpdateMenuItemMutation();
  const [uploadImage, { isLoading: isUploadingImage }] = useUploadMenuItemImageMutation();

  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      isAvailable: true,
    },
  });

  useEffect(() => {
    if (menuItem) {
      form.reset({
        name: menuItem.name,
        description: menuItem.description || '',
        price: menuItem.pricing?.amount || 0,
        isAvailable: menuItem.isAvailable,
      });
      setImagePreview(menuItem.imageUrls?.[0] || '');
      setSelectedFile(null);
    } else {
      form.reset({
        name: '',
        description: '',
        price: 0,
        isAvailable: true,
      });
      setImagePreview('');
      setSelectedFile(null);
    }
  }, [menuItem, form]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please upload an image file only',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Image size must be less than 5MB',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Store the file for upload later
    setSelectedFile(file);
  };

  const removeImage = () => {
    setImagePreview('');
    setSelectedFile(null);
  };

  const onSubmit = async (data: MenuItemFormData) => {
    if (!restaurantId || !categoryId || !branchId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Restaurant ID, branch ID, or category not found',
      });
      return;
    }

    try {
      let menuItemResult;

      if (menuItem) {
        // Update existing menu item
        menuItemResult = await updateMenuItem({
          restaurantId,
          itemId: menuItem.id,
          body: {
            name: data.name,
            description: data.description,
            pricing: {
              amount: data.price,
              currency: 'INR',
            },
            isAvailable: data.isAvailable,
          },
        }).unwrap();
      } else {
        // Create new menu item
        menuItemResult = await createMenuItem({
          restaurantId,
          branchId: branchId,
          body: {
            categoryId,
            name: data.name,
            description: data.description,
            pricing: {
              amount: data.price,
              currency: 'INR',
            },
            isAvailable: data.isAvailable,
          },
        }).unwrap();
      }

      // Upload image if a file was selected
      const itemId = menuItemResult?.id || (menuItem?.id || menuItem?._id);
      if (selectedFile && itemId) {
        try {
          await uploadImage({
            restaurantId,
            itemId: itemId,
            file: selectedFile,
          }).unwrap();
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          toast({
            variant: 'destructive',
            title: 'Warning',
            description: 'Menu item saved but image upload failed',
          });
        }
      }

      toast({
        title: menuItem ? 'Updated' : 'Created',
        description: `Menu item ${menuItem ? 'updated' : 'created'} successfully`,
      });

      onOpenChange(false);
      form.reset();
      setImagePreview('');
      setSelectedFile(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Operation failed',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {menuItem ? 'Edit Menu Item' : 'Add Menu Item'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="e.g., Chicken Biryani"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Brief description of the item"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (₹) *</Label>
            <Input
              id="price"
              type="number"
              {...form.register('price', { valueAsNumber: true })}
              placeholder="0"
              min="0"
              step="0.01"
            />
            {form.formState.errors.price && (
              <p className="text-sm text-destructive">
                {form.formState.errors.price.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-32 rounded-lg object-cover border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={removeImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label htmlFor="item-image-upload" className="cursor-pointer">
                  <div className="h-32 w-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2">
                    {isUploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Upload Image
                        </span>
                      </>
                    )}
                  </div>
                  <Input
                    id="item-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                </label>
                <div className="text-xs text-muted-foreground">
                  <p>Max size: 5MB</p>
                  <p>Format: JPG, PNG, WebP</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isAvailable"
              checked={form.watch('isAvailable')}
              onCheckedChange={(checked) => form.setValue('isAvailable', checked)}
            />
            <Label htmlFor="isAvailable" className="cursor-pointer">
              Available for ordering
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUpdating || isUploadingImage}
            >
              {isCreating || isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {menuItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
