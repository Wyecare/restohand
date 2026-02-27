import { Injectable, Inject, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Storage } from 'firebase-admin/storage';
import { FIREBASE_STORAGE } from '../../auth/firebase-admin.provider';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromBuffer } from 'file-type';

export interface UploadedImageInfo {
  publicUrl: string;
  fileName: string;
  path: string;
  size: number;
}

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);
  private readonly bucket: any;

  constructor(@Inject(FIREBASE_STORAGE) private readonly storage: Storage) {
    this.bucket = this.storage.bucket();
    this.logger.log('Firebase Storage initialized successfully');
  }

  async uploadMenuItemImage(
    restaurantId: string,
    menuItemId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadedImageInfo> {
    try {
      this.logger.log(`Starting upload for file: ${originalName}, size: ${fileBuffer.length} bytes`);

      // Validate file content and type
      await this.validateImageFile(fileBuffer, mimeType);

      // Validate file size (max 5MB)
      if (fileBuffer.length > 5 * 1024 * 1024) {
        throw new BadRequestException('File size must be less than 5MB');
      }

      // Generate unique filename
      const fileExtension = this.getFileExtension(originalName);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = `restaurants/${restaurantId}/menu-items/${menuItemId}/${fileName}`;

      this.logger.log(`Uploading to path: ${filePath}`);

      // Upload to Firebase Storage
      const file = this.bucket.file(filePath);
      const stream = file.createWriteStream({
        metadata: {
          contentType: mimeType,
          metadata: {
            restaurantId,
            menuItemId,
            originalName,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          this.logger.error('Upload error:', error);
          reject(new InternalServerErrorException('Failed to upload image'));
        });

        stream.on('finish', () => {
          this.logger.log(`Upload completed successfully for ${filePath}`);
          resolve({
            publicUrl: this.getPublicUrl(filePath),
            fileName,
            path: filePath,
            size: fileBuffer.length,
          });
        });

        stream.end(fileBuffer);
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Image upload error:', error);
      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  async uploadMenuCategoryImage(
    restaurantId: string,
    categoryId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadedImageInfo> {
    try {
      this.logger.log(`Starting category upload for file: ${originalName}, size: ${fileBuffer.length} bytes`);

      // Validate file content and type
      await this.validateImageFile(fileBuffer, mimeType);

      // Validate file size (max 5MB)
      if (fileBuffer.length > 5 * 1024 * 1024) {
        throw new BadRequestException('File size must be less than 5MB');
      }

      // Generate unique filename
      const fileExtension = this.getFileExtension(originalName);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = `restaurants/${restaurantId}/menu-categories/${categoryId}/${fileName}`;

      this.logger.log(`Uploading category to path: ${filePath}`);

      // Upload to Firebase Storage
      const file = this.bucket.file(filePath);
      const stream = file.createWriteStream({
        metadata: {
          contentType: mimeType,
          metadata: {
            restaurantId,
            categoryId,
            originalName,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error: Error) => {
          this.logger.error('Category upload error:', error);
          reject(new InternalServerErrorException('Failed to upload image'));
        });

        stream.on('finish', () => {
          this.logger.log(`Category upload completed successfully for ${filePath}`);
          resolve({
            publicUrl: this.getPublicUrl(filePath),
            fileName,
            path: filePath,
            size: fileBuffer.length,
          });
        });

        stream.end(fileBuffer);
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Category image upload error:', error);
      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  async deleteImage(imagePath: string): Promise<void> {
    try {
      const file = this.bucket.file(imagePath);
      await file.delete();
    } catch (error) {
      console.error('Error deleting image:', error);
      // Don't throw error for delete operations to avoid breaking other operations
    }
  }

  async deleteMenuItemImages(restaurantId: string, menuItemId: string): Promise<void> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `restaurants/${restaurantId}/menu-items/${menuItemId}/`,
      });

      const deletePromises = files.map((file) => file.delete().catch(console.error));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting menu item images:', error);
    }
  }

  async deleteMenuCategoryImages(restaurantId: string, categoryId: string): Promise<void> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `restaurants/${restaurantId}/menu-categories/${categoryId}/`,
      });

      const deletePromises = files.map((file) => file.delete().catch(console.error));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting menu category images:', error);
    }
  }

  private getPublicUrl(filePath: string): string {
    const bucketName = this.bucket.name;
    return `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filePath)}`;
  }

  private async validateImageFile(fileBuffer: Buffer, declaredMimeType: string): Promise<void> {
    // First check declared MIME type
    if (!this.isValidImageType(declaredMimeType)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      );
    }

    // Then validate actual file content
    try {
      const detectedType = await fileTypeFromBuffer(fileBuffer);

      if (!detectedType) {
        throw new BadRequestException('Unable to determine file type from content');
      }

      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(detectedType.mime)) {
        throw new BadRequestException(
          `File content does not match a valid image type. Detected: ${detectedType.mime}`
        );
      }

      // Ensure declared MIME type matches detected type
      // Note: image/jpg is often used instead of image/jpeg
      const normalizedDeclared = declaredMimeType === 'image/jpg' ? 'image/jpeg' : declaredMimeType;
      if (normalizedDeclared !== detectedType.mime) {
        throw new BadRequestException(
          `File content (${detectedType.mime}) does not match declared type (${declaredMimeType})`
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('File type detection error:', error);
      throw new BadRequestException('Unable to validate file content');
    }
  }

  private isValidImageType(mimeType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    return allowedTypes.includes(mimeType);
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return '.jpg'; // Default extension
    return filename.substring(lastDotIndex);
  }
}