import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MenuModifier, MenuModifierSchema } from './schemas/menu-modifier.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { MenuModifiersController } from './menu-modifiers.controller';
import { MenuModifiersService } from './menu-modifiers.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: MenuModifier.name, schema: MenuModifierSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
  ],
  controllers: [MenuModifiersController],
  providers: [MenuModifiersService],
  exports: [MenuModifiersService],
})
export class MenuModifiersModule {}