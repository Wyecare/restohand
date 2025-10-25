import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useFileUpload } from '@/hooks/use-file-upload';
import {
  useUploadMenuItemImageMutation,
  useRemoveMenuItemImageMutation
} from '@/store/api/restaurantsApi';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItemImageUploadProps {
  restaurantId: string;
  itemId: string;
  existingImages?: string[];
  onImageUploaded?: (imageUrl: string) => void;
  onImageRemoved?: (imageIndex: number) => void;
  className?: string;
}

export function MenuItemImageUpload({
  restaurantId,
  itemId,
  existingImages = [],
  onImageUploaded,
  onImageRemoved,
  className,
}: MenuItemImageUploadProps) {
  const { toast } = useToast();
  const [uploadImage, { isLoading: isUploading }] = useUploadMenuItemImageMutation();
  const [removeImage, { isLoading: isRemoving }] = useRemoveMenuItemImageMutation();
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  const [fileState, fileActions] = useFileUpload({
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: 'image/jpeg,image/png,image/webp',
    multiple: false,
    onFilesAdded: async (files) => {
      if (files.length > 0 && files[0].file instanceof File) {
        await handleUpload(files[0].file);
        fileActions.clearFiles();
      }
    },
  });

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadImage({
        restaurantId,
        itemId,
        image: file,
      }).unwrap();

      toast({
        title: 'Image uploaded successfully',
        description: `${file.name} has been added to the menu item`,
      });

      onImageUploaded?.(result.imageUrl);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (index: number) => {
    setRemovingIndex(index);
    try {
      await removeImage({
        restaurantId,
        itemId,
        imageIndex: index,
      }).unwrap();

      toast({
        title: 'Image removed',
        description: 'The image has been removed from the menu item',
      });

      onImageRemoved?.(index);
    } catch (error) {
      toast({
        title: 'Removal failed',
        description: 'Failed to remove image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRemovingIndex(null);
    }
  };

  const totalImages = existingImages.length + fileState.files.length;
  const canUploadMore = totalImages < 5;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      {canUploadMore && (
        <Card>
          <CardContent className="p-6">
            <div
              className={cn(
                'border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-muted-foreground/50',
                fileState.isDragging && 'border-primary bg-primary/5',
                isUploading && 'pointer-events-none opacity-50'
              )}
              onDragEnter={fileActions.handleDragEnter}
              onDragLeave={fileActions.handleDragLeave}
              onDragOver={fileActions.handleDragOver}
              onDrop={fileActions.handleDrop}
              onClick={fileActions.openFileDialog}
            >
              <input {...fileActions.getInputProps()} className="hidden" />

              {isUploading ? (
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading image...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Drop image here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, or WebP up to 5MB ({5 - totalImages} remaining)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {fileState.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                {fileState.errors.map((error, index) => (
                  <p key={index} className="text-sm text-destructive">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              Menu Item Images ({existingImages.length})
            </h4>
            <Badge variant="secondary" className="text-xs">
              {existingImages.length}/5
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {existingImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={imageUrl}
                    alt={`Menu item image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMTJMMTEgMTRMMTUgMTBNMjEgMTJDMjEgMTYuOTcwNiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NCAyMSAzIDE2Ljk3MDYgMyAxMkMzIDcuMDI5NCA3LjAyOTQgMyAxMiAzQzE2Ljk3MDYgMyAyMSA3LjAyOTQgMjEgMTJaIiBzdHJva2U9IiNhMWE5YjgiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                    }}
                  />
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(index)}
                  disabled={isRemoving && removingIndex === index}
                >
                  {isRemoving && removingIndex === index ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {existingImages.length === 0 && !isUploading && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No images uploaded yet</p>
          <p className="text-xs">Add images to make your menu items more appealing</p>
        </div>
      )}
    </div>
  );
}