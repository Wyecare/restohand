import { z } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { SimpleCombobox } from '@/components/ui/simple-combobox';
import { MenuItemImageUpload } from './MenuItemImageUpload';
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
import { Info, Inheritance } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getCategorySuggestions,
  getMenuItemSuggestions,
  getPriceSuggestions,
} from '@/lib/kerala-menu-suggestions';
import { useCreateMenuItemMutation } from '@/store/api/restaurantsApi';
import type { MenuCategory } from '@/store/api/types';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

const itemSchema = z.object({
  name: z.string().min(2, 'Item name is required'),
  categoryName: z.string().min(1, 'Please select a category'),
  description: z.string().optional(),
  price: z.number().min(1, 'Price must be at least ₹1'),
  isTaxInclusive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  gstRateId: z.string().optional(),
  useCustomGst: z.boolean().default(false),
});

type FormData = z.infer<typeof itemSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  categories: MenuCategory[];
  onSuccess?: () => void;
}

const STEPS = {
  BASIC_INFO: 'basic',
  IMAGES: 'images',
  ADVANCED: 'advanced',
} as const;

type Step = typeof STEPS[keyof typeof STEPS];

export function MenuItemCreateDialog({
  open,
  onOpenChange,
  restaurantId,
  categories,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [createMenuItem, { isLoading }] = useCreateMenuItemMutation();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.BASIC_INFO);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      categoryName: '',
      description: '',
      price: 0,
      isTaxInclusive: true,
      isAvailable: true,
      gstRateId: '',
      useCustomGst: false,
    },
  });

  const allCategories = [
    ...categories.map((c) => c.name),
    ...getCategorySuggestions(),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const menuItemSuggestions = selectedCategory
    ? getMenuItemSuggestions(selectedCategory)
    : [];

  const priceSuggestions = getPriceSuggestions().map((p) => `₹${p}`);

  const handleAddTag = () => {
    const tag = tagsInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleBasicInfoSubmit = async (data: FormData) => {
    try {
      const existingCategory = categories.find(
        (c) => c.name.toLowerCase() === data.categoryName.toLowerCase()
      );

      const result = await createMenuItem({
        restaurantId,
        body: {
          name: data.name,
          categoryId: existingCategory?.id,
          description: data.description || undefined,
          pricing: {
            amount: data.price,
            currency: 'INR',
            isTaxInclusive: data.isTaxInclusive,
          },
          isAvailable: data.isAvailable,
          tags,
        },
      }).unwrap();

      setCreatedItemId(result.id);
      setCurrentStep(STEPS.IMAGES);

      toast({
        title: 'Item created successfully!',
        description: `${data.name} has been added to your menu.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Could not create item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    // Reset all state
    form.reset();
    setSelectedCategory('');
    setCurrentStep(STEPS.BASIC_INFO);
    setCreatedItemId(null);
    setTags([]);
    setTagsInput('');
    setUploadedImages([]);
    onOpenChange(false);
  };

  const handleComplete = () => {
    handleClose();
    onSuccess?.();
  };

  const handleImageUploaded = (imageUrl: string) => {
    setUploadedImages(prev => [...prev, imageUrl]);
  };

  const handleImageRemoved = (imageUrl: string) => {
    setUploadedImages(prev => prev.filter(url => url !== imageUrl));
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.BASIC_INFO:
        return 'Add Menu Item';
      case STEPS.IMAGES:
        return 'Add Images (Optional)';
      case STEPS.ADVANCED:
        return 'Advanced Settings';
      default:
        return 'Add Menu Item';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case STEPS.BASIC_INFO:
        return 'Enter the basic details for your menu item';
      case STEPS.IMAGES:
        return 'Upload images to make your item more appealing';
      case STEPS.ADVANCED:
        return 'Configure additional settings and tags';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>

          {/* Step indicator */}
          <div className="flex items-center space-x-2 pt-2">
            <div className={`flex items-center ${currentStep === STEPS.BASIC_INFO ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === STEPS.BASIC_INFO ? 'bg-primary text-primary-foreground' : createdItemId ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                {createdItemId ? <Check className="w-3 h-3" /> : '1'}
              </div>
              <span className="ml-2 text-sm">Basic Info</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div className={`flex items-center ${currentStep === STEPS.IMAGES ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === STEPS.IMAGES ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2
              </div>
              <span className="ml-2 text-sm">Images</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div className={`flex items-center ${currentStep === STEPS.ADVANCED ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === STEPS.ADVANCED ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                3
              </div>
              <span className="ml-2 text-sm">Advanced</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === STEPS.BASIC_INFO && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleBasicInfoSubmit)}
                className="space-y-4"
              >
                {/* Category */}
                <FormField
                  control={form.control}
                  name="categoryName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <FormControl>
                        <SimpleCombobox
                          value={field.value}
                          onValueChange={(v) => {
                            form.setValue('categoryName', v);
                            setSelectedCategory(v);
                          }}
                          suggestions={allCategories}
                          placeholder="e.g., Breakfast, Curry"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Item Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <SimpleCombobox
                          value={field.value}
                          onValueChange={(v) => form.setValue('name', v)}
                          suggestions={menuItemSuggestions}
                          placeholder="e.g., Appam, Puttu, Dosa"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Short note about the dish"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Price */}
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 25"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-wrap gap-1">
                  {priceSuggestions.slice(0, 6).map((price) => (
                    <Button
                      key={price}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        form.setValue('price', parseInt(price.replace('₹', '')))
                      }
                    >
                      {price}
                    </Button>
                  ))}
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create & Add Images'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {/* Step 2: Images */}
          {currentStep === STEPS.IMAGES && createdItemId && (
            <div className="space-y-4">
              <MenuItemImageUpload
                restaurantId={restaurantId}
                itemId={createdItemId}
                existingImages={uploadedImages}
                onImageUploaded={handleImageUploaded}
                onImageRemoved={handleImageRemoved}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(STEPS.BASIC_INFO)}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleComplete}
                >
                  Skip Images
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(STEPS.ADVANCED)}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 3: Advanced Settings */}
          {currentStep === STEPS.ADVANCED && (
            <Form {...form}>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="isTaxInclusive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Tax Inclusive Price</FormLabel>
                          <FormDescription className="text-xs">
                            Price includes all applicable taxes
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isAvailable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Available for Orders</FormLabel>
                          <FormDescription className="text-xs">
                            Customers can order this item
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag (e.g., spicy, vegan, popular)"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
                <FormDescription>
                  Tags help customers find items and highlight special attributes
                </FormDescription>
              </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(STEPS.IMAGES)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleComplete}
                  >
                    Complete
                  </Button>
                </DialogFooter>
              </div>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}