import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, X, Plus, Trash2, Leaf, Flame } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateMenuItemForBranchMutation,
  useUpdateMenuItemMutation,
  useUploadMenuItemImageMutation,
} from '@/store/api/restaurantsApi';
import { useListMenuModifiersByBranchQuery } from '@/store/api/menuModifiersApi';
import { useListMenuPriceTagsByBranchQuery } from '@/store/api/menuPriceTagsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';
import type { MenuModifier } from '@/store/api/menuModifiersApi';
import type { MenuPriceTag } from '@/store/api/menuPriceTagsApi';

const ingredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required'),
  allergens: z.array(z.string()).default([]),
  isDairyFree: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  isNutFree: z.boolean().default(false),
});

const nutritionalInfoSchema = z.object({
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbohydrates: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  servingSize: z.string().optional(),
});

const menuItemFormSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  isAvailable: z.boolean(),
  nutritionalInfo: nutritionalInfoSchema.optional(),
  ingredients: z.array(ingredientSchema).default([]),
  dietaryInfo: z
    .object({
      isVegan: z.boolean().default(false),
      isVegetarian: z.boolean().default(false),
      isGlutenFree: z.boolean().default(false),
      isDairyFree: z.boolean().default(false),
      isNutFree: z.boolean().default(false),
      isSpicy: z.boolean().default(false),
      isHalal: z.boolean().default(false),
      isKosher: z.boolean().default(false),
    })
    .optional(),
  preparationTime: z.string().optional(),
  preparationInstructions: z.string().optional(),
  applicableModifiers: z.array(z.string()).default([]),
  priceTagIds: z.array(z.string()).default([]),
  activePriceTagId: z.string().optional(),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

const commonAllergens = [
  'Nuts',
  'Dairy',
  'Gluten',
  'Soy',
  'Eggs',
  'Fish',
  'Shellfish',
  'Sesame',
];

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    amount: number;
    currency: string;
  };
  isAvailable: boolean;
  imageUrls?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    servingSize?: string;
  };
  ingredients?: Array<{
    name: string;
    allergens: string[];
    isDairyFree: boolean;
    isVegan: boolean;
    isVegetarian: boolean;
    isGlutenFree: boolean;
    isNutFree: boolean;
  }>;
  dietaryInfo?: {
    isVegan: boolean;
    isVegetarian: boolean;
    isGlutenFree: boolean;
    isDairyFree: boolean;
    isNutFree: boolean;
    isSpicy: boolean;
    isHalal: boolean;
    isKosher: boolean;
  };
  preparationTime?: string;
  preparationInstructions?: string;
  applicableModifiers?: string[];
  priceTagIds?: string[];
  activePriceTagId?: string;
}

interface MenuItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem?: MenuItem | null;
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

  const [createMenuItem, { isLoading: isCreating }] =
    useCreateMenuItemForBranchMutation();
  const [updateMenuItem, { isLoading: isUpdating }] =
    useUpdateMenuItemMutation();
  const [uploadImage, { isLoading: isUploadingImage }] =
    useUploadMenuItemImageMutation();

  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch available modifiers and price tags
  const modifiersQuery =
    restaurantId && branchId ? { restaurantId, branchId } : skipToken;
  const { data: modifiersData } =
    useListMenuModifiersByBranchQuery(modifiersQuery);
  const { data: priceTagsData } =
    useListMenuPriceTagsByBranchQuery(modifiersQuery);

  const availableModifiers = useMemo(
    () => modifiersData?.data || [],
    [modifiersData?.data]
  );
  const availablePriceTags = useMemo(
    () => priceTagsData?.data || [],
    [priceTagsData?.data]
  );

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      isAvailable: true,
      nutritionalInfo: {
        calories: undefined,
        protein: undefined,
        carbohydrates: undefined,
        fat: undefined,
        fiber: undefined,
        sugar: undefined,
        sodium: undefined,
        servingSize: '',
      },
      ingredients: [],
      dietaryInfo: {
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
        isDairyFree: false,
        isNutFree: false,
        isSpicy: false,
        isHalal: false,
        isKosher: false,
      },
      preparationTime: '',
      preparationInstructions: '',
      applicableModifiers: [],
      priceTagIds: [],
      activePriceTagId: undefined,
    },
  });

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  useEffect(() => {
    if (menuItem) {
      const assignedModifierIds = availableModifiers
        .filter((modifier) =>
          modifier.applicableMenuItems?.includes(menuItem.id)
        )
        .map((modifier) => modifier.id);

      const assignedPriceTagIds = availablePriceTags
        .filter((priceTag) =>
          priceTag.itemPrices?.some(
            (itemPrice) => itemPrice.menuItemId === menuItem.id
          )
        )
        .map((priceTag) => priceTag.id);

      form.reset({
        name: menuItem.name,
        description: menuItem.description || '',
        price: menuItem.pricing?.amount || 0,
        isAvailable: menuItem.isAvailable,
        nutritionalInfo: menuItem.nutritionalInfo || {
          calories: undefined,
          protein: undefined,
          carbohydrates: undefined,
          fat: undefined,
          fiber: undefined,
          sugar: undefined,
          sodium: undefined,
          servingSize: '',
        },
        ingredients: menuItem.ingredients || [],
        dietaryInfo: menuItem.dietaryInfo || {
          isVegan: false,
          isVegetarian: false,
          isGlutenFree: false,
          isDairyFree: false,
          isNutFree: false,
          isSpicy: false,
          isHalal: false,
          isKosher: false,
        },
        preparationTime: menuItem.preparationTime,
        preparationInstructions: menuItem.preparationInstructions || '',
        applicableModifiers: assignedModifierIds,
        priceTagIds: assignedPriceTagIds,
        activePriceTagId: menuItem.activePriceTagId,
      });
      setImagePreview(menuItem.imageUrls?.[0] || '');
      setSelectedFile(null);
    } else {
      form.reset({
        name: '',
        description: '',
        price: 0,
        isAvailable: true,
        nutritionalInfo: {
          calories: undefined,
          protein: undefined,
          carbohydrates: undefined,
          fat: undefined,
          fiber: undefined,
          sugar: undefined,
          sodium: undefined,
          servingSize: '',
        },
        ingredients: [],
        dietaryInfo: {
          isVegan: false,
          isVegetarian: false,
          isGlutenFree: false,
          isDairyFree: false,
          isNutFree: false,
          isSpicy: false,
          isHalal: false,
          isKosher: false,
        },
        preparationTime: '',
        preparationInstructions: '',
        applicableModifiers: [],
        priceTagIds: [],
        activePriceTagId: undefined,
      });
      setImagePreview('');
      setSelectedFile(null);
    }
  }, [menuItem, availableModifiers, availablePriceTags, form]);

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

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
  };

  const removeImage = () => {
    setImagePreview('');
    setSelectedFile(null);
  };

  const addIngredient = () => {
    appendIngredient({
      name: '',
      allergens: [],
      isDairyFree: false,
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: false,
      isNutFree: false,
    });
  };

  const addAllergenToIngredient = (
    ingredientIndex: number,
    allergen: string
  ) => {
    const currentAllergens =
      form.getValues(`ingredients.${ingredientIndex}.allergens`) || [];
    if (!currentAllergens.includes(allergen)) {
      form.setValue(`ingredients.${ingredientIndex}.allergens`, [
        ...currentAllergens,
        allergen,
      ]);
    }
  };

  const removeAllergenFromIngredient = (
    ingredientIndex: number,
    allergen: string
  ) => {
    const currentAllergens =
      form.getValues(`ingredients.${ingredientIndex}.allergens`) || [];
    form.setValue(
      `ingredients.${ingredientIndex}.allergens`,
      currentAllergens.filter((a) => a !== allergen)
    );
  };

  const computeDietaryFlags = () => {
    const ingredients = form.getValues('ingredients') || [];
    if (ingredients.length === 0) return;

    const isVegan = ingredients.every((ing) => ing.isVegan);
    const isVegetarian = ingredients.every((ing) => ing.isVegetarian);
    const isGlutenFree = ingredients.every((ing) => ing.isGlutenFree);
    const isDairyFree = ingredients.every((ing) => ing.isDairyFree);
    const isNutFree = ingredients.every((ing) => ing.isNutFree);

    form.setValue('dietaryInfo.isVegan', isVegan);
    form.setValue('dietaryInfo.isVegetarian', isVegetarian);
    form.setValue('dietaryInfo.isGlutenFree', isGlutenFree);
    form.setValue('dietaryInfo.isDairyFree', isDairyFree);
    form.setValue('dietaryInfo.isNutFree', isNutFree);
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
      let menuItemResult: { id?: string } = {};

      const payload = {
        name: data.name,
        description: data.description,
        pricing: {
          amount: data.price,
          currency: 'INR',
        },
        isAvailable: data.isAvailable,
        nutritionalInfo: data.nutritionalInfo,
        ingredients: data.ingredients,
        dietaryInfo: data.dietaryInfo,
        preparationTime: data.preparationTime,
        preparationInstructions: data.preparationInstructions,
        applicableModifiers: data.applicableModifiers,
        priceTagIds: data.priceTagIds,
        activePriceTagId: data.activePriceTagId,
      };

      if (menuItem) {
        menuItemResult = await updateMenuItem({
          restaurantId,
          itemId: menuItem.id,
          body: payload,
        }).unwrap();
      } else {
        menuItemResult = await createMenuItem({
          restaurantId,
          branchId: branchId,
          body: {
            categoryId,
            ...payload,
          },
        }).unwrap();
      }

      const itemId = menuItemResult?.id || menuItem?.id;
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
        description: `Menu item ${
          menuItem ? 'updated' : 'created'
        } successfully`,
      });

      onOpenChange(false);
      form.reset();
      setImagePreview('');
      setSelectedFile(null);
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message || 'Operation failed'
          : 'Operation failed';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[60vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {menuItem ? 'Edit Menu Item' : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit as any)}
          className="space-y-6"
        >
          {/* Basic Information - Always Visible */}
          <div className="space-y-6 bg-muted/30 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-base font-semibold">
                    Item Name *
                  </Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="e.g., Chicken Biryani"
                    className="mt-2 h-12 text-base"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="price" className="text-base font-semibold">
                    Price (₹) *
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    {...form.register('price', { valueAsNumber: true })}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="mt-2 h-12 text-base"
                  />
                  {form.formState.errors.price && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.price.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="preparationTime"
                    className="text-base font-semibold"
                  >
                    Preparation Time
                  </Label>
                  <Input
                    id="preparationTime"
                    type="text"
                    {...form.register('preparationTime')}
                    placeholder="15 minutes"
                    className="mt-2 h-12 text-base"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                  <Label
                    htmlFor="isAvailable"
                    className="text-base font-medium cursor-pointer"
                  >
                    Available for ordering
                  </Label>
                  <Switch
                    id="isAvailable"
                    checked={form.watch('isAvailable')}
                    onCheckedChange={(checked) =>
                      form.setValue('isAvailable', checked)
                    }
                  />
                </div>
              </div>

              {/* Right Column - Image */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Item Image</Label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-64 rounded-lg object-cover border-2"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="item-image-upload"
                    className="cursor-pointer block"
                  >
                    <div className="w-full h-64 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-3 bg-muted/20">
                      {isUploadingImage ? (
                        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm font-medium text-muted-foreground">
                              Click to upload image
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Max 5MB • JPG, PNG, WebP
                            </p>
                          </div>
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
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-base font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Brief description of the item"
                rows={3}
                className="mt-2 text-base"
              />
            </div>

            {/* Quick Dietary Badges */}
            <div>
              <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                <Leaf className="h-5 w-5" />
                Dietary & Special Tags
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center space-x-2 p-3 bg-background rounded-lg border">
                  <Checkbox
                    id="isVegetarian"
                    checked={form.watch('dietaryInfo.isVegetarian')}
                    onCheckedChange={(checked) =>
                      form.setValue('dietaryInfo.isVegetarian', !!checked)
                    }
                  />
                  <Label
                    htmlFor="isVegetarian"
                    className="cursor-pointer font-medium"
                  >
                    🥬 Vegetarian
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-background rounded-lg border">
                  <Checkbox
                    id="isVegan"
                    checked={form.watch('dietaryInfo.isVegan')}
                    onCheckedChange={(checked) =>
                      form.setValue('dietaryInfo.isVegan', !!checked)
                    }
                  />
                  <Label
                    htmlFor="isVegan"
                    className="cursor-pointer font-medium"
                  >
                    🌱 Vegan
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-background rounded-lg border">
                  <Checkbox
                    id="isSpicy"
                    checked={form.watch('dietaryInfo.isSpicy')}
                    onCheckedChange={(checked) =>
                      form.setValue('dietaryInfo.isSpicy', !!checked)
                    }
                  />
                  <Label
                    htmlFor="isSpicy"
                    className="cursor-pointer font-medium flex items-center gap-1"
                  >
                    🌶️ Spicy
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-background rounded-lg border">
                  <Checkbox
                    id="isHalal"
                    checked={form.watch('dietaryInfo.isHalal')}
                    onCheckedChange={(checked) =>
                      form.setValue('dietaryInfo.isHalal', !!checked)
                    }
                  />
                  <Label
                    htmlFor="isHalal"
                    className="cursor-pointer font-medium"
                  >
                    ☪️ Halal
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Accordion for Additional Details */}
          <Accordion type="multiple" className="w-full space-y-4">
            {/* More Dietary Options */}
            <AccordionItem value="dietary" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                More Dietary Options
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="isGlutenFree"
                      checked={form.watch('dietaryInfo.isGlutenFree')}
                      onCheckedChange={(checked) =>
                        form.setValue('dietaryInfo.isGlutenFree', !!checked)
                      }
                    />
                    <Label htmlFor="isGlutenFree" className="cursor-pointer">
                      Gluten-Free
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="isDairyFree"
                      checked={form.watch('dietaryInfo.isDairyFree')}
                      onCheckedChange={(checked) =>
                        form.setValue('dietaryInfo.isDairyFree', !!checked)
                      }
                    />
                    <Label htmlFor="isDairyFree" className="cursor-pointer">
                      Dairy-Free
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="isNutFree"
                      checked={form.watch('dietaryInfo.isNutFree')}
                      onCheckedChange={(checked) =>
                        form.setValue('dietaryInfo.isNutFree', !!checked)
                      }
                    />
                    <Label htmlFor="isNutFree" className="cursor-pointer">
                      Nut-Free
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="isKosher"
                      checked={form.watch('dietaryInfo.isKosher')}
                      onCheckedChange={(checked) =>
                        form.setValue('dietaryInfo.isKosher', !!checked)
                      }
                    />
                    <Label htmlFor="isKosher" className="cursor-pointer">
                      Kosher
                    </Label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Ingredients */}
            <AccordionItem
              value="ingredients"
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                Ingredients & Allergens ({ingredientFields.length})
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2 space-y-4">
                <div className="flex justify-between items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addIngredient}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ingredient
                  </Button>
                  {ingredientFields.length > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={computeDietaryFlags}
                    >
                      Auto-Compute Dietary Flags
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {ingredientFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border rounded-lg p-4 bg-muted/30"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <Input
                            {...form.register(`ingredients.${index}.name`)}
                            placeholder="Ingredient name (e.g., Chicken, Rice)"
                            className="font-medium"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`ing-veg-${index}`}
                                checked={form.watch(
                                  `ingredients.${index}.isVegetarian`
                                )}
                                onCheckedChange={(checked) =>
                                  form.setValue(
                                    `ingredients.${index}.isVegetarian`,
                                    !!checked
                                  )
                                }
                              />
                              <Label
                                htmlFor={`ing-veg-${index}`}
                                className="text-sm cursor-pointer"
                              >
                                Vegetarian
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`ing-vegan-${index}`}
                                checked={form.watch(
                                  `ingredients.${index}.isVegan`
                                )}
                                onCheckedChange={(checked) =>
                                  form.setValue(
                                    `ingredients.${index}.isVegan`,
                                    !!checked
                                  )
                                }
                              />
                              <Label
                                htmlFor={`ing-vegan-${index}`}
                                className="text-sm cursor-pointer"
                              >
                                Vegan
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`ing-gluten-${index}`}
                                checked={form.watch(
                                  `ingredients.${index}.isGlutenFree`
                                )}
                                onCheckedChange={(checked) =>
                                  form.setValue(
                                    `ingredients.${index}.isGlutenFree`,
                                    !!checked
                                  )
                                }
                              />
                              <Label
                                htmlFor={`ing-gluten-${index}`}
                                className="text-sm cursor-pointer"
                              >
                                Gluten-Free
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`ing-dairy-${index}`}
                                checked={form.watch(
                                  `ingredients.${index}.isDairyFree`
                                )}
                                onCheckedChange={(checked) =>
                                  form.setValue(
                                    `ingredients.${index}.isDairyFree`,
                                    !!checked
                                  )
                                }
                              />
                              <Label
                                htmlFor={`ing-dairy-${index}`}
                                className="text-sm cursor-pointer"
                              >
                                Dairy-Free
                              </Label>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm mb-2 block">
                              Allergens
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {form
                                .watch(`ingredients.${index}.allergens`)
                                ?.map((allergen) => (
                                  <Badge
                                    key={allergen}
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() =>
                                      removeAllergenFromIngredient(
                                        index,
                                        allergen
                                      )
                                    }
                                  >
                                    {allergen} ×
                                  </Badge>
                                ))}
                              {commonAllergens.map((allergen) => {
                                const isSelected = form
                                  .watch(`ingredients.${index}.allergens`)
                                  ?.includes(allergen);
                                if (!isSelected) {
                                  return (
                                    <Button
                                      key={allergen}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        addAllergenToIngredient(index, allergen)
                                      }
                                    >
                                      + {allergen}
                                    </Button>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIngredient(index)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Nutrition Info */}
            <AccordionItem value="nutrition" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                Nutritional Information (Optional)
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      {...form.register('nutritionalInfo.calories', {
                        valueAsNumber: true,
                      })}
                      placeholder="0"
                      min="0"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="protein">Protein (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      {...form.register('nutritionalInfo.protein', {
                        valueAsNumber: true,
                      })}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="carbohydrates">Carbs (g)</Label>
                    <Input
                      id="carbohydrates"
                      type="number"
                      {...form.register('nutritionalInfo.carbohydrates', {
                        valueAsNumber: true,
                      })}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fat">Fat (g)</Label>
                    <Input
                      id="fat"
                      type="number"
                      {...form.register('nutritionalInfo.fat', {
                        valueAsNumber: true,
                      })}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="mt-2"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Preparation Instructions */}
            <AccordionItem
              value="preparation"
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                Preparation Instructions
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <Textarea
                  {...form.register('preparationInstructions')}
                  placeholder="Special instructions for preparing this item..."
                  rows={4}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Modifiers */}
            {availableModifiers.length > 0 && (
              <AccordionItem
                value="modifiers"
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Modifiers ({form.watch('applicableModifiers')?.length || 0}{' '}
                  selected)
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableModifiers.map((modifier: MenuModifier) => (
                      <div
                        key={modifier.id}
                        className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/30"
                      >
                        <Checkbox
                          id={`modifier-${modifier.id}`}
                          checked={form
                            .watch('applicableModifiers')
                            ?.includes(modifier.id)}
                          onCheckedChange={(checked) => {
                            const current =
                              form.getValues('applicableModifiers') || [];
                            if (checked) {
                              form.setValue('applicableModifiers', [
                                ...current,
                                modifier.id,
                              ]);
                            } else {
                              form.setValue(
                                'applicableModifiers',
                                current.filter((id) => id !== modifier.id)
                              );
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`modifier-${modifier.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {modifier.name}
                          </Label>
                          {modifier.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {modifier.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant={
                                modifier.selectionType === 'single'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {modifier.selectionType === 'single'
                                ? 'Single'
                                : 'Multiple'}
                            </Badge>
                            {modifier.isRequired && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>

                          {/* Modifier Options */}
                          {modifier.options && modifier.options.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Options ({modifier.options.length}):
                              </p>
                              <div className="space-y-1">
                                {modifier.options
                                  .filter(option => option.isAvailable)
                                  .sort((a, b) => a.displayOrder - b.displayOrder)
                                  .slice(0, 4) // Show first 4 options
                                  .map((option) => (
                                    <div
                                      key={option.id}
                                      className="flex items-center justify-between text-xs p-2 bg-background rounded border"
                                    >
                                      <div className="flex-1">
                                        <span className="font-medium">{option.name}</span>
                                        {option.description && (
                                          <span className="text-muted-foreground ml-1">
                                            - {option.description}
                                          </span>
                                        )}
                                      </div>
                                      {option.priceAdjustment !== 0 && (
                                        <div className="ml-2">
                                          <Badge
                                            variant={option.priceAdjustment > 0 ? "default" : "secondary"}
                                            className="text-xs"
                                          >
                                            {option.priceAdjustment > 0 ? '+' : ''}₹{option.priceAdjustment}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                {modifier.options.filter(option => option.isAvailable).length > 4 && (
                                  <div className="text-xs text-muted-foreground text-center py-1">
                                    +{modifier.options.filter(option => option.isAvailable).length - 4} more options
                                  </div>
                                )}
                              </div>

                              {/* Selection constraints */}
                              <div className="mt-2 text-xs text-muted-foreground">
                                {modifier.selectionType === 'single' ? (
                                  "Choose exactly 1 option"
                                ) : (
                                  `Choose ${modifier.minSelections}-${modifier.maxSelections} options`
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Price Tags */}
            {availablePriceTags.length > 0 && (
              <AccordionItem value="pricing" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Price Tags ({form.watch('priceTagIds')?.length || 0} selected)
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availablePriceTags.map((priceTag: MenuPriceTag) => (
                      <div
                        key={priceTag.id}
                        className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/30"
                      >
                        <Checkbox
                          id={`pricetag-${priceTag.id}`}
                          checked={form
                            .watch('priceTagIds')
                            ?.includes(priceTag.id)}
                          onCheckedChange={(checked) => {
                            const current = form.getValues('priceTagIds') || [];
                            if (checked) {
                              form.setValue('priceTagIds', [
                                ...current,
                                priceTag.id,
                              ]);
                            } else {
                              const newPriceTagIds = current.filter(
                                (id) => id !== priceTag.id
                              );
                              form.setValue('priceTagIds', newPriceTagIds);

                              // Clear active price tag if it was the one being removed
                              const currentActivePriceTagId =
                                form.getValues('activePriceTagId');
                              if (currentActivePriceTagId === priceTag.id) {
                                form.setValue('activePriceTagId', undefined);
                              }
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: priceTag.color }}
                            />
                            <Label
                              htmlFor={`pricetag-${priceTag.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {priceTag.name}
                            </Label>
                          </div>
                          {priceTag.description && (
                            <p className="text-sm text-muted-foreground">
                              {priceTag.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {priceTag.isActive && (
                              <Badge className="bg-green-600 text-white text-xs">
                                Active
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              Priority {priceTag.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Active Price Tag Selection */}
                  {form.watch('priceTagIds')?.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <Label className="text-base font-semibold">
                        Active Price Tag for Customers
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1 mb-3">
                        Choose which price tag customers will see when ordering
                        this item
                      </p>

                      <Select
                        value={form.watch('activePriceTagId') || ''}
                        onValueChange={(value) => {
                          form.setValue(
                            'activePriceTagId',
                            value === '' ? undefined : value
                          );
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Use base price (no price tag)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                              <span>Use base price (no price tag)</span>
                            </div>
                          </SelectItem>
                          {form.watch('priceTagIds')?.map((priceTagId) => {
                            const priceTag = availablePriceTags.find(
                              (pt) => pt.id === priceTagId
                            );
                            if (!priceTag) return null;
                            return (
                              <SelectItem key={priceTag.id} value={priceTag.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: priceTag.color }}
                                  />
                                  <span>{priceTag.name}</span>
                                  {priceTag.isActive && (
                                    <Badge className="bg-green-600 text-white text-xs ml-2">
                                      Active
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {form.watch('activePriceTagId') && (
                        <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Selected:</span>{' '}
                            {availablePriceTags.find(
                              (pt) => pt.id === form.watch('activePriceTagId')
                            )?.name || 'Unknown'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUpdating || isUploadingImage}
              size="lg"
              className="min-w-32"
            >
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>{menuItem ? 'Update Item' : 'Create Item'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
