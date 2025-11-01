import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import {
  useGetRecipesQuery,
  useGetRecipeCostSummaryQuery,
  useRecalculateAllCostsMutation,
  useStandardizeRecipeMutation,
  useUnstandardizeRecipeMutation,
} from '@/store/api/recipesApi';
import {
  ChefHat,
  Calculator,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  RefreshCw,
} from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

const RecipesPage = () => {
  const session = useAppSelector(selectAuthSession);
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [standardizedFilter, setStandardizedFilter] = useState<string>('');
  const [menuItemFilter, setMenuItemFilter] = useState<string>('');

  const {
    data: recipes,
    isLoading: recipesLoading,
    isError: recipesError,
  } = useGetRecipesQuery(
    restaurantId
      ? {
          restaurantId,
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
          isStandardized:
            standardizedFilter === 'true'
              ? true
              : standardizedFilter === 'false'
              ? false
              : undefined,
          hasMenuItem:
            menuItemFilter === 'true'
              ? true
              : menuItemFilter === 'false'
              ? false
              : undefined,
        }
      : skipToken
  );

  const { data: costSummary, isLoading: summaryLoading } =
    useGetRecipeCostSummaryQuery(restaurantId ?? skipToken);

  const [recalculateAllCosts, { isLoading: recalculatingCosts }] =
    useRecalculateAllCostsMutation();
  const [standardizeRecipe] = useStandardizeRecipeMutation();
  const [unstandardizeRecipe] = useUnstandardizeRecipeMutation();

  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    return recipes.filter((recipe) => {
      const matchesSearch =
        !searchQuery ||
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory || recipe.category === selectedCategory;

      const matchesStandardized =
        !standardizedFilter ||
        (standardizedFilter === 'true' && recipe.isStandardized) ||
        (standardizedFilter === 'false' && !recipe.isStandardized);

      const matchesMenuItem =
        !menuItemFilter ||
        (menuItemFilter === 'true' && recipe.menuItemId) ||
        (menuItemFilter === 'false' && !recipe.menuItemId);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStandardized &&
        matchesMenuItem
      );
    });
  }, [
    recipes,
    searchQuery,
    selectedCategory,
    standardizedFilter,
    menuItemFilter,
  ]);

  const categories = useMemo(() => {
    if (!recipes) return [];
    const cats = recipes
      .map((recipe) => recipe.category)
      .filter((cat): cat is string => Boolean(cat));
    return Array.from(new Set(cats));
  }, [recipes]);

  const handleRecalculateCosts = async () => {
    if (!restaurantId) return;
    try {
      await recalculateAllCosts(restaurantId).unwrap();
    } catch (error) {
      console.error('Failed to recalculate costs:', error);
    }
  };

  const handleStandardizeToggle = async (
    recipeId: string,
    isStandardized: boolean
  ) => {
    if (!restaurantId) return;
    try {
      if (isStandardized) {
        await unstandardizeRecipe({ restaurantId, recipeId }).unwrap();
      } else {
        await standardizeRecipe({ restaurantId, recipeId }).unwrap();
      }
    } catch (error) {
      console.error('Failed to toggle standardization:', error);
    }
  };

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (recipesLoading || summaryLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Recipe Management
          </h1>
          <p className="text-muted-foreground">
            Manage recipes, calculate costs, and optimize menu profitability
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRecalculateCosts}
            disabled={recalculatingCosts}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                recalculatingCosts ? 'animate-spin' : ''
              }`}
            />
            {recalculatingCosts ? 'Recalculating...' : 'Update Costs'}
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Recipe
          </Button>
        </div>
      </div>

      {/* Cost Summary Cards */}
      {costSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Recipes
              </CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {costSummary.totalRecipes}
              </div>
              <p className="text-xs text-muted-foreground">Recipe portfolio</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Food Cost
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(costSummary.averageFoodCost)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per serving average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Profit Margin
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPercentage(costSummary.averageProfitMargin)}
              </div>
              <p className="text-xs text-muted-foreground">
                Menu profitability
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Low Margin Items
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {costSummary.lowMarginRecipes.length}
              </div>
              <p className="text-xs text-muted-foreground">Need optimization</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Profitable & Low Margin Recipes */}
      {costSummary &&
        (costSummary.topProfitableRecipes.length > 0 ||
          costSummary.lowMarginRecipes.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Profitable */}
            {costSummary.topProfitableRecipes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Top Profitable Recipes
                  </CardTitle>
                  <CardDescription>
                    Highest profit margin recipes in your menu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {costSummary.topProfitableRecipes
                    .slice(0, 3)
                    .map((recipe) => (
                      <div
                        key={recipe.recipeId}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{recipe.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Profit: {formatCurrency(recipe.profit)}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          {formatPercentage(recipe.profitMargin)}
                        </Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Low Margin Recipes */}
            {costSummary.lowMarginRecipes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-orange-500" />
                    Low Margin Recipes
                  </CardTitle>
                  <CardDescription>
                    Recipes that may need cost optimization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {costSummary.lowMarginRecipes.slice(0, 3).map((recipe) => (
                    <div
                      key={recipe.recipeId}
                      className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{recipe.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Cost: {formatCurrency(recipe.totalCost)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-orange-200">
                        {formatPercentage(recipe.profitMargin)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

      {/* Filters and Recipes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recipes</CardTitle>
          <CardDescription>
            Create and manage recipes with cost analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={standardizedFilter}
              onValueChange={setStandardizedFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Standard" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipes</SelectItem>
                <SelectItem value="true">Standardized</SelectItem>
                <SelectItem value="false">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={menuItemFilter} onValueChange={setMenuItemFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Menu Link" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipes</SelectItem>
                <SelectItem value="true">Linked to Menu</SelectItem>
                <SelectItem value="false">Not Linked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recipes Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Servings</TableHead>
                  <TableHead>Cost per Serving</TableHead>
                  <TableHead>Profit Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes?.length ? (
                  filteredRecipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{recipe.name}</div>
                          {recipe.description && (
                            <div className="text-sm text-muted-foreground">
                              {recipe.description}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {recipe.preparationTime && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {recipe.preparationTime}m prep
                              </Badge>
                            )}
                            {recipe.servings > 1 && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {recipe.servings} servings
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {recipe.category && (
                          <Badge variant="outline">{recipe.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{recipe.servings}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(recipe.costAnalysis.totalCost)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Food:{' '}
                          {formatCurrency(
                            recipe.costAnalysis.totalIngredientCost
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {recipe.costAnalysis.profitMargin !== undefined ? (
                          <div
                            className={`font-medium ${
                              recipe.costAnalysis.profitMargin >= 30
                                ? 'text-green-600'
                                : recipe.costAnalysis.profitMargin >= 20
                                ? 'text-orange-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatPercentage(recipe.costAnalysis.profitMargin)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Not linked
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStandardizeToggle(
                                recipe.id,
                                recipe.isStandardized
                              )
                            }
                            className="h-6 px-2 justify-start"
                          >
                            {recipe.isStandardized ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                <span className="text-green-600">
                                  Standardized
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1 text-orange-600" />
                                <span className="text-orange-600">Draft</span>
                              </>
                            )}
                          </Button>
                          {recipe.menuItemId && (
                            <Badge variant="outline" className="text-xs w-fit">
                              Linked to Menu
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {recipesError
                          ? 'Error loading recipes'
                          : filteredRecipes?.length === 0
                          ? 'No recipes found matching your criteria'
                          : 'No recipes created yet'}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipesPage;
