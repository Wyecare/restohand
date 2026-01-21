import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsEmail, IsPhoneNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BranchAddressDto {
  @ApiProperty({ description: 'Address line 1' })
  @IsString()
  line1!: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city!: string;

  @ApiProperty({ description: 'State' })
  @IsString()
  state!: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  postalCode!: string;

  @ApiPropertyOptional({ description: 'Country code', default: 'IN' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class BranchSettingsDto {
  @ApiPropertyOptional({ description: 'Order number prefix', default: 'ORD' })
  @IsOptional()
  @IsString()
  orderNumberPrefix?: string;

  @ApiPropertyOptional({ description: 'Enable takeout orders', default: true })
  @IsOptional()
  @IsBoolean()
  enableTakeout?: boolean;

  @ApiPropertyOptional({ description: 'Enable dine-in orders', default: true })
  @IsOptional()
  @IsBoolean()
  enableDineIn?: boolean;

  @ApiPropertyOptional({ description: 'Enable delivery orders', default: false })
  @IsOptional()
  @IsBoolean()
  enableDelivery?: boolean;

  @ApiPropertyOptional({ description: 'Delivery radius in km', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryRadius?: number;

  @ApiPropertyOptional({ description: 'Delivery fee in paise', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ description: 'Minimum order value in paise', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderValue?: number;

  @ApiPropertyOptional({ description: 'Opening time in HH:mm format' })
  @IsOptional()
  @IsString()
  openingTime?: string;

  @ApiPropertyOptional({ description: 'Closing time in HH:mm format' })
  @IsOptional()
  @IsString()
  closingTime?: string;

  @ApiPropertyOptional({
    description: 'Operating days (0=Sunday, 1=Monday, etc.)',
    default: [0, 1, 2, 3, 4, 5, 6],
    type: [Number]
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  operatingDays?: number[];
}

export class CreateBranchDto {
  @ApiProperty({ description: 'Branch name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Branch slug (URL-friendly identifier)' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ description: 'Branch description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Branch address', type: BranchAddressDto })
  @ValidateNested()
  @Type(() => BranchAddressDto)
  address!: BranchAddressDto;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact email address' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Is this the main branch', default: false })
  @IsOptional()
  @IsBoolean()
  isMainBranch?: boolean;

  @ApiPropertyOptional({ description: 'Is the branch active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Branch settings', type: BranchSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BranchSettingsDto)
  settings?: BranchSettingsDto;

  @ApiPropertyOptional({ description: 'Manager name' })
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional({ description: 'Manager phone number' })
  @IsOptional()
  @IsString()
  managerPhone?: string;

  @ApiPropertyOptional({ description: 'Sort order for display', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Establishment date' })
  @IsOptional()
  establishedDate?: Date;
}