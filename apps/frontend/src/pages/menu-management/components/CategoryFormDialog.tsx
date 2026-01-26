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
import { Loader2, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateMenuCategoryForBranchMutation,
  useUpdateMenuCategoryMutation,
  useUploadMenuCategoryImageMutation,
  useListMenuCategoriesByBranchQuery,
} from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: any;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: CategoryFormDialogProps) {
  const { toast } = useToast();
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const queryParams =
    restaurantId && branchId ? { restaurantId, branchId } : skipToken;
  const { data: categoriesData, refetch: refetchCategories } =
    useListMenuCategoriesByBranchQuery(queryParams);

  const [createCategory, { isLoading: isCreating }] =
    useCreateMenuCategoryForBranchMutation();
  const [updateCategory, { isLoading: isUpdating }] =
    useUpdateMenuCategoryMutation();
  const [uploadImage, { isLoading: isUploadingImage }] =
    useUploadMenuCategoryImageMutation();

  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || '',
      });
      setImagePreview(category.imageUrl || '');
      setSelectedFile(null);
    } else {
      form.reset({
        name: '',
        description: '',
      });
      setImagePreview('');
      setSelectedFile(null);
    }
  }, [category, form]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('Selected file:', file);
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

  const onSubmit = async (data: CategoryFormData) => {
    if (!restaurantId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Restaurant ID not found',
      });
      return;
    }

    if (!branchId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Branch ID not found',
      });
      return;
    }

    try {
      let categoryResult;

      if (category) {
        // Update existing category
        categoryResult = await updateCategory({
          restaurantId,
          categoryId: category._id || category.id,
          body: {
            name: data.name,
            description: data.description,
            isActive: category.isActive,
          },
        }).unwrap();
      } else {
        // Create new category
        const categories = categoriesData?.data || [];
        categoryResult = await createCategory({
          restaurantId,
          branchId: branchId,
          body: {
            name: data.name,
            description: data.description,
            displayOrder: categories.length + 1,
            isActive: true,
          },
        }).unwrap();
      }

      // Upload image if a file was selected
      const categoryId = categoryResult?.id || (category?._id || category?.id);
      if (selectedFile && categoryId) {
        try {
          await uploadImage({
            restaurantId,
            categoryId: categoryId,
            file: selectedFile,
          }).unwrap();
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          toast({
            variant: 'destructive',
            title: 'Warning',
            description: 'Category saved but image upload failed',
          });
        }
      }

      toast({
        title: category ? 'Updated' : 'Created',
        description: `Category ${
          category ? 'updated' : 'created'
        } successfully`,
      });

      refetchCategories();
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
            {category ? 'Edit Category' : 'Add Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="e.g., Appetizers, Main Course"
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
              placeholder="Brief description of the category"
              rows={3}
            />
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
                <label htmlFor="image-upload" className="cursor-pointer">
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
                    id="image-upload"
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
              {category ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
