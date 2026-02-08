import { PartialType } from '@nestjs/swagger';
import { CreateMenuPriceTagDto } from './create-menu-price-tag.dto';

export class UpdateMenuPriceTagDto extends PartialType(CreateMenuPriceTagDto) {}