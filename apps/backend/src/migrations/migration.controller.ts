import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateDefaultBranchesMigration } from './create-default-branches.migration';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Migrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('migrations')
export class MigrationController {
  constructor(
    private readonly defaultBranchesMigration: CreateDefaultBranchesMigration,
  ) {}

  @Post('create-default-branches')
  @Roles(UserRole.Owner) // Only system owners can run migrations
  @ApiOperation({ summary: 'Create default branches for all restaurants' })
  @ApiResponse({ status: 200, description: 'Migration completed successfully' })
  @ApiResponse({ status: 500, description: 'Migration failed' })
  async createDefaultBranches() {
    await this.defaultBranchesMigration.execute();
    return { message: 'Default branches migration completed successfully' };
  }

  @Post('rollback-default-branches')
  @Roles(UserRole.Owner) // Only system owners can rollback migrations
  @ApiOperation({ summary: 'Rollback default branches migration' })
  @ApiResponse({ status: 200, description: 'Rollback completed successfully' })
  @ApiResponse({ status: 500, description: 'Rollback failed' })
  async rollbackDefaultBranches() {
    await this.defaultBranchesMigration.rollback();
    return { message: 'Default branches rollback completed successfully' };
  }
}