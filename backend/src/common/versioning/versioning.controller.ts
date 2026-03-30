import { Controller, Get, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { Role } from '../enums/role.enum';
import { VersionAnalyticsService } from './version-analytics.service';
import {
  SUPPORTED_VERSIONS,
  CURRENT_VERSION,
  DEPRECATED_VERSIONS,
} from './versioning.middleware';

@ApiTags('versioning')
@Controller({ path: 'versioning', version: VERSION_NEUTRAL })
export class VersioningController {
  constructor(private readonly versionAnalytics: VersionAnalyticsService) {}

  @Get('info')
  @ApiOperation({ summary: 'Get API version information and sunset policy' })
  getVersionInfo() {
    return {
      current: CURRENT_VERSION,
      supported: SUPPORTED_VERSIONS,
      deprecated: Object.entries(DEPRECATED_VERSIONS).map(([v, info]) => ({
        version: v,
        ...info,
      })),
      migrationGuide: `/api/v${CURRENT_VERSION}/docs`,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get version usage analytics (admin only)' })
  getStats(): Record<string, { count: number; lastSeen: Date }> {
    return this.versionAnalytics.getStats();
  }
}
