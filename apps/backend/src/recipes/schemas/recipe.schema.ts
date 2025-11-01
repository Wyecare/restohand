import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type RecipeDocument = Recipe & Document;

@Schema({ _id: false })
class RecipeIngredient {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'InventoryItem', required: true, index: true })
  inventoryItemId!: string;

  @Prop({ type: String, required: true })
  ingredientName!: string; // Cached name for quick display

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number; // Quantity needed per serving

  @Prop({ type: String, required: true })
  unit!: string; // Unit of measurement (should match inventory item unit)

  @Prop({ type: Number, min: 0 })
  costPerUnit?: number; // Cached cost per unit from inventory

  @Prop({ type: Number, min: 0 })
  totalCost?: number; // Calculated: quantity * costPerUnit

  @Prop({ type: String })
  notes?: string; // Preparation notes for this ingredient
}

const RecipeIngredientSchema = SchemaFactory.createForClass(RecipeIngredient);

@Schema({ _id: false })
class RecipeNutrition {
  @Prop({ type: Number, min: 0 })
  calories?: number;

  @Prop({ type: Number, min: 0 })
  protein?: number; // in grams

  @Prop({ type: Number, min: 0 })
  carbs?: number; // in grams

  @Prop({ type: Number, min: 0 })
  fat?: number; // in grams

  @Prop({ type: Number, min: 0 })
  fiber?: number; // in grams
}

const RecipeNutritionSchema = SchemaFactory.createForClass(RecipeNutrition);

@Schema({ _id: false })
class RecipeCostAnalysis {
  @Prop({ type: Number, required: true, min: 0 })
  totalIngredientCost!: number; // Sum of all ingredient costs

  @Prop({ type: Number, min: 0 })
  laborCost?: number; // Estimated labor cost per serving

  @Prop({ type: Number, min: 0 })
  overheadCost?: number; // Allocated overhead per serving

  @Prop({ type: Number, required: true, min: 0 })
  totalCost!: number; // Total cost per serving

  @Prop({ type: Number, min: 0 })
  sellingPrice?: number; // Menu price (from linked menu item)

  @Prop({ type: Number })
  profitMargin?: number; // Calculated profit margin percentage

  @Prop({ type: Number })
  profit?: number; // Absolute profit per serving

  @Prop({ type: Date })
  lastCalculated?: Date; // When costs were last calculated
}

const RecipeCostAnalysisSchema = SchemaFactory.createForClass(RecipeCostAnalysis);

@Schema({
  timestamps: true,
  collection: 'recipes',
})
export class Recipe {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'MenuItem', index: true })
  menuItemId?: string; // Optional link to menu item

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  description?: string;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  servings!: number; // Number of servings this recipe makes

  @Prop({ type: [RecipeIngredientSchema], required: true })
  ingredients!: RecipeIngredient[];

  @Prop({ type: [String], default: [] })
  instructions!: string[]; // Step-by-step cooking instructions

  @Prop({ type: Number, min: 0 })
  preparationTime?: number; // in minutes

  @Prop({ type: Number, min: 0 })
  cookingTime?: number; // in minutes

  @Prop({ type: Number, min: 0 })
  totalTime?: number; // prep + cooking time

  @Prop({ type: String })
  difficulty?: string; // Easy, Medium, Hard

  @Prop({ type: [String], default: [] })
  dietaryTags!: string[]; // Vegetarian, Vegan, Gluten-Free, etc.

  @Prop({ type: RecipeNutritionSchema })
  nutrition?: RecipeNutrition;

  @Prop({ type: RecipeCostAnalysisSchema, required: true })
  costAnalysis!: RecipeCostAnalysis;

  @Prop({ type: String })
  category?: string; // Main Course, Appetizer, Dessert, etc.

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: false })
  isStandardized!: boolean; // Whether this recipe is finalized and standardized

  @Prop({ type: String })
  notes?: string; // General recipe notes

  @Prop({ type: [String], default: [] })
  imageUrls!: string[]; // Recipe/dish images

  @Prop({ type: String })
  createdBy?: string; // User ID who created the recipe

  @Prop({ type: String })
  lastModifiedBy?: string; // User ID who last modified the recipe
}

export const RecipeSchema = SchemaFactory.createForClass(Recipe);

// Indexes for performance
RecipeSchema.index({ restaurantId: 1, isActive: 1 });
RecipeSchema.index({ restaurantId: 1, menuItemId: 1 });
RecipeSchema.index({ restaurantId: 1, category: 1 });
RecipeSchema.index({ restaurantId: 1, name: 'text' });