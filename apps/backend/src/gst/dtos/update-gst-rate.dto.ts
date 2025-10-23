import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateGstRateDto } from './create-gst-rate.dto';

export class UpdateGstRateDto extends PartialType(CreateGstRateDto) {}