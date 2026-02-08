import { PartialType } from '@nestjs/swagger';
import { CreateMenuModifierDto } from './create-menu-modifier.dto';

export class UpdateMenuModifierDto extends PartialType(CreateMenuModifierDto) {}