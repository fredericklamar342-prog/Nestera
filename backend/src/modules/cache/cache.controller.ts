import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CacheStrategyService } from './cache-strategy.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Cache')
@Controller('cache')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CacheController {
  constructor(private readonly cacheStrategy: CacheStrategyService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get cache hit/miss metrics' })
  getMetrics() {
    return this.cacheStrategy.getMetrics();
  }

  @Get('reset-metrics')
  @ApiOperation({ summary: 'Reset cache metrics' })
  resetMetrics() {
    this.cacheStrategy.resetMetrics();
    return { message: 'Cache metrics reset' };
  }
}
