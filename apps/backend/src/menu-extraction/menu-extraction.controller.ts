import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { MenuExtractionService } from './menu-extraction.service';
import { ExtractMenuFromBase64Dto, BulkImportMenuDto } from './dto/extract-menu.dto';

@ApiTags('Menu Extraction')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('menu-extraction')
export class MenuExtractionController {
  constructor(private readonly menuExtractionService: MenuExtractionService) {}

  @Post('extract-from-file')
  @ApiOperation({ summary: 'Extract menu data from uploaded PDF file using Claude API' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Menu extracted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid PDF or extraction failed' })
  @UseInterceptors(FileInterceptor('file'))
  async extractMenuFromFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }

    // Convert file buffer to base64
    const base64Data = file.buffer.toString('base64');

    return this.menuExtractionService.extractMenuFromBase64(base64Data, file.mimetype);
  }

  @Post('extract-from-base64')
  @ApiOperation({ summary: 'Extract menu data from base64-encoded PDF using Claude API' })
  @ApiResponse({ status: 200, description: 'Menu extracted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or extraction failed' })
  async extractMenuFromBase64(
    @Body() dto: ExtractMenuFromBase64Dto,
  ) {
    return this.menuExtractionService.extractMenuFromBase64(dto.base64Data, dto.mediaType);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import extracted menu data (categories and items) to restaurant' })
  @ApiResponse({ status: 201, description: 'Menu imported successfully' })
  @ApiResponse({ status: 400, description: 'Import failed' })
  async bulkImportMenu(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkImportMenuDto,
  ) {
    const restaurantId = user.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID not found in user context');
    }

    return this.menuExtractionService.bulkImportMenu(restaurantId, {
      categories: dto.categories,
      currency: dto.currency || 'INR',
      extractedAt: new Date().toISOString(),
    });
  }
}