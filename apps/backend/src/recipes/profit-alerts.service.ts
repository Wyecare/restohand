import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Recipe, RecipeDocument } from './schemas/recipe.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';

export interface ProfitAlert {
  id: string;
  restaurantId: string;
  type: 'low_margin' | 'negative_margin' | 'cost_increase' | 'price_optimization';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  itemId?: string;
  itemName?: string;
  recipeId?: string;
  recipeName?: string;
  currentMargin?: number;
  recommendedAction?: string;
  potentialSavings?: number;
  createdAt: Date;
}

export interface ProfitAnalysisReport {
  restaurantId: string;
  totalItems: number;
  itemsWithRecipes: number;
  overallProfitability: {
    averageMargin: number;
    totalProfit: number;
    marginDistribution: {
      high: number; // >40%
      medium: number; // 20-40%
      low: number; // 5-20%
      negative: number; // <5%
    };
  };
  alerts: ProfitAlert[];
  recommendations: {
    repriceItems: Array<{
      itemId: string;
      itemName: string;
      currentPrice: number;
      recommendedPrice: number;
      marginImprovement: number;
    }>;
    optimizeCosts: Array<{
      recipeId: string;
      recipeName: string;
      currentCost: number;
      optimizationOpportunity: string;
      potentialSavings: number;
    }>;
  };
  trends: {
    costTrend: 'increasing' | 'stable' | 'decreasing';
    marginTrend: 'improving' | 'stable' | 'declining';
  };
}

@Injectable()
export class ProfitAlertsService {
  constructor(
    @InjectModel(Recipe.name) private recipeModel: Model<RecipeDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  async generateProfitAnalysisReport(restaurantId: string): Promise<ProfitAnalysisReport> {
    const [recipes, menuItems] = await Promise.all([
      this.recipeModel.find({ restaurantId, isActive: true }).populate('menuItemId').lean(),
      this.menuItemModel.find({ restaurantId }).lean(),
    ]);

    const recipesWithMenuItems = recipes.filter(recipe => recipe.menuItemId);
    const alerts = await this.generateAlerts(restaurantId, recipesWithMenuItems);

    // Calculate profitability metrics
    const marginsData = recipesWithMenuItems
      .map(recipe => recipe.costAnalysis.profitMargin)
      .filter(margin => margin !== undefined) as number[];

    const averageMargin = marginsData.length > 0
      ? marginsData.reduce((sum, margin) => sum + margin, 0) / marginsData.length
      : 0;

    const totalProfit = recipesWithMenuItems.reduce(
      (sum, recipe) => sum + (recipe.costAnalysis.profit || 0),
      0
    );

    const marginDistribution = {
      high: marginsData.filter(margin => margin > 40).length,
      medium: marginsData.filter(margin => margin >= 20 && margin <= 40).length,
      low: marginsData.filter(margin => margin >= 5 && margin < 20).length,
      negative: marginsData.filter(margin => margin < 5).length,
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(recipesWithMenuItems);

    return {
      restaurantId,
      totalItems: menuItems.length,
      itemsWithRecipes: recipesWithMenuItems.length,
      overallProfitability: {
        averageMargin,
        totalProfit,
        marginDistribution,
      },
      alerts,
      recommendations,
      trends: {
        costTrend: 'stable', // This would need historical data
        marginTrend: 'stable', // This would need historical data
      },
    };
  }

  private async generateAlerts(
    restaurantId: string,
    recipes: any[]
  ): Promise<ProfitAlert[]> {
    const alerts: ProfitAlert[] = [];

    for (const recipe of recipes) {
      const margin = recipe.costAnalysis.profitMargin;
      const profit = recipe.costAnalysis.profit;
      const totalCost = recipe.costAnalysis.totalCost;
      const sellingPrice = recipe.costAnalysis.sellingPrice;

      // Critical: Negative margin
      if (margin !== undefined && margin < 0) {
        alerts.push({
          id: `negative_${recipe._id}`,
          restaurantId,
          type: 'negative_margin',
          severity: 'critical',
          title: 'Negative Profit Margin',
          message: `${recipe.name} is selling at a loss with ${margin.toFixed(1)}% margin`,
          recipeId: recipe._id.toString(),
          recipeName: recipe.name,
          currentMargin: margin,
          recommendedAction: `Increase price to ₹${(totalCost * 1.3).toFixed(2)} for 30% margin`,
          potentialSavings: Math.abs(profit || 0),
          createdAt: new Date(),
        });
      }
      // Warning: Low margin (0-15%)
      else if (margin !== undefined && margin >= 0 && margin < 15) {
        const recommendedPrice = totalCost * 1.25; // 25% margin
        alerts.push({
          id: `low_margin_${recipe._id}`,
          restaurantId,
          type: 'low_margin',
          severity: 'warning',
          title: 'Low Profit Margin',
          message: `${recipe.name} has only ${margin.toFixed(1)}% profit margin`,
          recipeId: recipe._id.toString(),
          recipeName: recipe.name,
          currentMargin: margin,
          recommendedAction: `Consider increasing price to ₹${recommendedPrice.toFixed(2)}`,
          potentialSavings: (recommendedPrice - (sellingPrice || 0)) * 0.25, // Estimated additional profit
          createdAt: new Date(),
        });
      }

      // Price optimization opportunities
      if (margin !== undefined && margin >= 15 && margin < 25) {
        const optimizedPrice = totalCost * 1.35; // 35% margin
        if (optimizedPrice > (sellingPrice || 0)) {
          alerts.push({
            id: `optimize_${recipe._id}`,
            restaurantId,
            type: 'price_optimization',
            severity: 'info',
            title: 'Price Optimization Opportunity',
            message: `${recipe.name} could support higher pricing for better margins`,
            recipeId: recipe._id.toString(),
            recipeName: recipe.name,
            currentMargin: margin,
            recommendedAction: `Test price increase to ₹${optimizedPrice.toFixed(2)}`,
            potentialSavings: (optimizedPrice - (sellingPrice || 0)) * 0.1, // Conservative estimate
            createdAt: new Date(),
          });
        }
      }

      // High cost alerts (>70% of selling price)
      if (sellingPrice && totalCost / sellingPrice > 0.7) {
        alerts.push({
          id: `high_cost_${recipe._id}`,
          restaurantId,
          type: 'cost_increase',
          severity: 'warning',
          title: 'High Food Cost Ratio',
          message: `${recipe.name} has food cost at ${((totalCost / sellingPrice) * 100).toFixed(1)}% of selling price`,
          recipeId: recipe._id.toString(),
          recipeName: recipe.name,
          currentMargin: margin,
          recommendedAction: 'Review recipe portions or find cost-effective ingredient alternatives',
          potentialSavings: totalCost * 0.1, // 10% cost reduction opportunity
          createdAt: new Date(),
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private generateRecommendations(recipes: any[]): ProfitAnalysisReport['recommendations'] {
    const repriceItems = recipes
      .filter(recipe => {
        const margin = recipe.costAnalysis.profitMargin;
        return margin !== undefined && margin >= 0 && margin < 25;
      })
      .map(recipe => {
        const currentPrice = recipe.costAnalysis.sellingPrice || 0;
        const totalCost = recipe.costAnalysis.totalCost;
        const recommendedPrice = totalCost * 1.3; // Target 30% margin
        const currentMargin = recipe.costAnalysis.profitMargin || 0;
        const newMargin = ((recommendedPrice - totalCost) / recommendedPrice) * 100;

        return {
          itemId: recipe.menuItemId._id.toString(),
          itemName: recipe.name,
          currentPrice,
          recommendedPrice: Number(recommendedPrice.toFixed(2)),
          marginImprovement: Number((newMargin - currentMargin).toFixed(1)),
        };
      })
      .sort((a, b) => b.marginImprovement - a.marginImprovement)
      .slice(0, 5);

    const optimizeCosts = recipes
      .filter(recipe => {
        const margin = recipe.costAnalysis.profitMargin;
        const foodCostRatio = recipe.costAnalysis.sellingPrice
          ? recipe.costAnalysis.totalCost / recipe.costAnalysis.sellingPrice
          : 1;
        return margin !== undefined && (margin < 20 || foodCostRatio > 0.6);
      })
      .map(recipe => {
        const totalCost = recipe.costAnalysis.totalCost;
        const potentialSavings = totalCost * 0.15; // Assume 15% cost reduction is possible

        return {
          recipeId: recipe._id.toString(),
          recipeName: recipe.name,
          currentCost: Number(totalCost.toFixed(2)),
          optimizationOpportunity: 'Review portion sizes and ingredient costs',
          potentialSavings: Number(potentialSavings.toFixed(2)),
        };
      })
      .sort((a, b) => b.potentialSavings - a.potentialSavings)
      .slice(0, 5);

    return {
      repriceItems,
      optimizeCosts,
    };
  }

  async getActiveAlerts(restaurantId: string): Promise<ProfitAlert[]> {
    const report = await this.generateProfitAnalysisReport(restaurantId);
    return report.alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'warning');
  }

  async getCriticalMarginAlerts(restaurantId: string): Promise<ProfitAlert[]> {
    const report = await this.generateProfitAnalysisReport(restaurantId);
    return report.alerts.filter(alert => alert.severity === 'critical');
  }
}