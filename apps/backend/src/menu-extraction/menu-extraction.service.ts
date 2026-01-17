import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuCategory } from '../menu-categories/schemas/menu-category.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import * as https from 'https';

export interface ExtractedMenuItem {
  name: string;
  description?: string;
  price: number;
  variants?: Array<{
    name: string;
    price: number;
  }>;
}

export interface ExtractedCategory {
  name: string;
  items: ExtractedMenuItem[];
}

export interface ExtractedMenu {
  categories: ExtractedCategory[];
  currency?: string;
  extractedAt: string;
  confidence?: string;
  notes?: string[];
}

export interface BulkImportResult {
  success: boolean;
  categoriesCreated: number;
  categoriesUpdated: number;
  itemsCreated: number;
  itemsUpdated: number;
  errors: Array<{
    type: 'category' | 'item';
    name: string;
    error: string;
  }>;
}

@Injectable()
export class MenuExtractionService {
  private readonly logger = new Logger(MenuExtractionService.name);
  private readonly anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  constructor(
    @InjectModel(MenuCategory.name) private categoryModel: Model<MenuCategory>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
  ) {}

  /**
   * Extract menu from base64-encoded PDF data using Claude API
   */
  async extractMenuFromBase64(base64Data: string, mediaType: string = 'application/pdf'): Promise<ExtractedMenu> {
    if (!this.anthropicApiKey) {
      throw new BadRequestException('ANTHROPIC_API_KEY is not configured');
    }

    this.logger.log('Extracting menu from base64 PDF data');

    const extractedMenu = await this.callClaudeForExtraction(base64Data, mediaType);
    return extractedMenu;
  }

  /**
   * Bulk import extracted menu data into the database
   * Uses upsert logic - updates existing categories/items or creates new ones
   */
  async bulkImportMenu(restaurantId: string, menu: ExtractedMenu): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      success: true,
      categoriesCreated: 0,
      categoriesUpdated: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: [],
    };

    this.logger.log(`Importing menu for restaurant ${restaurantId}: ${menu.categories.length} categories`);

    for (const extractedCategory of menu.categories) {
      try {
        // Upsert category - find by name and restaurant, update or create
        const categoryResult = await this.categoryModel.findOneAndUpdate(
          {
            restaurantId: new Types.ObjectId(restaurantId),
            name: extractedCategory.name,
          },
          {
            $set: {
              description: extractedCategory.name, // Use name as description for now
            },
            $setOnInsert: {
              restaurantId: new Types.ObjectId(restaurantId),
              name: extractedCategory.name,
              displayOrder: 0,
              isActive: true,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );

        const category = categoryResult;
        const wasUpdated = !categoryResult.isNew;

        if (wasUpdated) {
          result.categoriesUpdated++;
          this.logger.log(`Updated category: ${extractedCategory.name}`);
        } else {
          result.categoriesCreated++;
          this.logger.log(`Created category: ${extractedCategory.name}`);
        }

        // Upsert items for this category
        this.logger.log(`Processing ${extractedCategory.items.length} items for category ${extractedCategory.name} (ID: ${category._id})`);
        for (const extractedItem of extractedCategory.items) {
          try {
            this.logger.log(`Creating/updating item: ${extractedItem.name} for category ID: ${category._id}`);
            const itemResult = await this.menuItemModel.findOneAndUpdate(
              {
                restaurantId: new Types.ObjectId(restaurantId),
                categoryId: category._id,
                name: extractedItem.name,
              },
              {
                $set: {
                  description: extractedItem.description || '',
                  pricing: {
                    amount: extractedItem.price || 0,
                    currency: 'INR',
                  },
                },
                $setOnInsert: {
                  restaurantId: new Types.ObjectId(restaurantId),
                  categoryId: category._id,
                  name: extractedItem.name,
                  isAvailable: true,
                  displayOrder: 0,
                  imageUrls: [],
                  tags: [],
                },
              },
              {
                upsert: true,
                new: true,
              },
            );

            const itemWasUpdated = !itemResult.isNew;

            if (itemWasUpdated) {
              result.itemsUpdated++;
              this.logger.log(`Updated item: ${extractedItem.name} in category: ${category._id}`);
            } else {
              result.itemsCreated++;
              this.logger.log(`Created item: ${extractedItem.name} in category: ${category._id}`);
            }
          } catch (itemError: any) {
            result.errors.push({
              type: 'item',
              name: extractedItem.name,
              error: itemError.message,
            });
            this.logger.error(`Failed to upsert item ${extractedItem.name}: ${itemError.message}`);
          }
        }
      } catch (categoryError: any) {
        result.errors.push({
          type: 'category',
          name: extractedCategory.name,
          error: categoryError.message,
        });
        this.logger.error(`Failed to upsert category ${extractedCategory.name}: ${categoryError.message}`);
      }
    }

    result.success = result.errors.length === 0;
    this.logger.log(
      `Import complete: ${result.categoriesCreated} categories created, ${result.categoriesUpdated} updated, ` +
      `${result.itemsCreated} items created, ${result.itemsUpdated} updated, ${result.errors.length} errors`
    );

    return result;
  }

  /**
   * Call Claude API to extract menu data from PDF
   */
  private async callClaudeForExtraction(base64Data: string, mediaType: string = 'application/pdf'): Promise<ExtractedMenu> {
    const prompt = `You are a menu extraction specialist for restaurants in India. Analyze this restaurant menu PDF and extract all the information in a structured JSON format.

IMPORTANT RULES:
1. Extract ALL categories and their items - do not skip any
2. For each item, extract: name, description (if available), price
3. Prices should be numbers only (no currency symbols) - these are in INR (Indian Rupees)
4. If an item has size variants (Small/Medium/Large, etc.), use the base price for the main item
5. Be thorough - don't miss any items
6. Return ONLY valid JSON, no markdown or explanations
7. Currency is always INR (Indian Rupees)
8. Do not include any Arabic text or multi-language fields

Return the data in this exact JSON structure:
{
  "categories": [
    {
      "name": "Category Name",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description if available",
          "price": 250.00
        }
      ]
    }
  ],
  "currency": "INR",
  "confidence": "high/medium/low",
  "notes": ["Any notes about unclear items or assumptions made"]
}`;

    const requestBody = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestBody);

      const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            this.logger.error(`Claude API error: ${res.statusCode} - ${data}`);
            reject(new Error(`Claude API error: ${res.statusCode}`));
            return;
          }

          try {
            const response = JSON.parse(data);
            const content = response.content[0].text;

            // Extract JSON from response (Claude might wrap it in markdown)
            let extractedJson: ExtractedMenu;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              extractedJson = JSON.parse(jsonMatch[0]);
            } else {
              extractedJson = JSON.parse(content);
            }

            // Add extraction timestamp
            extractedJson.extractedAt = new Date().toISOString();

            this.logger.log(`Extraction complete: ${extractedJson.categories?.length || 0} categories found`);
            resolve(extractedJson);
          } catch (parseError: any) {
            this.logger.error(`Failed to parse Claude response: ${parseError.message}`);
            reject(new Error(`Failed to parse extraction result: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error(`Claude API request error: ${error.message}`);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
}