import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsArray, ValidateNested, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AlcoholVatRateDto {
  @ApiProperty({
    description: 'Type of alcoholic beverage',
    enum: ['beer', 'wine', 'spirits', 'general'],
    example: 'beer'
  })
  @IsEnum(['beer', 'wine', 'spirits', 'general'])
  alcoholType: 'beer' | 'wine' | 'spirits' | 'general';

  @ApiProperty({
    description: 'VAT rate percentage for this alcohol type',
    minimum: 0,
    maximum: 100,
    example: 20
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate: number;

  @ApiProperty({
    description: 'Optional description for this VAT rate',
    required: false,
    example: 'Standard beer VAT rate'
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class StateVatConfigurationDto {
  @ApiProperty({
    description: 'Full name of the state',
    example: 'Karnataka'
  })
  @IsString()
  @IsNotEmpty()
  stateName: string;

  @ApiProperty({
    description: 'Two-letter state code',
    example: 'KA'
  })
  @IsString()
  @IsNotEmpty()
  stateCode: string;

  @ApiProperty({
    description: 'VAT rates for different types of alcohol',
    type: [AlcoholVatRateDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlcoholVatRateDto)
  alcoholVatRates?: AlcoholVatRateDto[];

  @ApiProperty({
    description: 'Default VAT rate for uncategorized alcohol in this state',
    minimum: 0,
    maximum: 100,
    example: 25
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultVatRate: number;

  @ApiProperty({
    description: 'Whether this state configuration is active',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Additional notes about this state VAT configuration',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateVatConfigurationDto {
  @ApiProperty({
    description: 'Unique name for this VAT configuration',
    example: 'India Alcohol VAT 2024'
  })
  @IsString()
  @IsNotEmpty()
  configurationName: string;

  @ApiProperty({
    description: 'State-wise VAT configurations',
    type: [StateVatConfigurationDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StateVatConfigurationDto)
  stateConfigurations: StateVatConfigurationDto[];

  @ApiProperty({
    description: 'Global fallback VAT rate when no state-specific rate is found',
    minimum: 0,
    maximum: 100,
    default: 20,
    example: 20
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  globalDefaultVatRate?: number;

  @ApiProperty({
    description: 'Whether this configuration is active',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Description of this VAT configuration',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateVatConfigurationDto extends PartialType(CreateVatConfigurationDto) {}

export class VatConfigurationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  configurationName: string;

  @ApiProperty({ type: [StateVatConfigurationDto] })
  stateConfigurations: StateVatConfigurationDto[];

  @ApiProperty()
  globalDefaultVatRate: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty({ required: false })
  lastModifiedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BulkStateVatRateDto {
  @ApiProperty({
    description: 'Apply the same VAT rates to multiple states',
    example: ['Karnataka', 'Tamil Nadu', 'Kerala']
  })
  @IsArray()
  @IsString({ each: true })
  stateNames: string[];

  @ApiProperty({
    description: 'VAT rates to apply to all specified states',
    type: [AlcoholVatRateDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlcoholVatRateDto)
  alcoholVatRates: AlcoholVatRateDto[];

  @ApiProperty({
    description: 'Default VAT rate for these states',
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultVatRate: number;
}