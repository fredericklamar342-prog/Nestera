import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TypeOrmHealthIndicator } from './indicators/typeorm.health';
import { IndexerHealthIndicator } from './indicators/indexer.health';
import { RpcHealthIndicator } from './indicators/rpc.health';
import {
  RedisHealthIndicator,
  EmailServiceHealthIndicator,
  SorobanRpcHealthIndicator,
  HorizonHealthIndicator,
} from './indicators/external-services.health';
import { HealthHistoryService } from './health-history.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly indexer: IndexerHealthIndicator,
    private readonly rpc: RpcHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly email: EmailServiceHealthIndicator,
    private readonly sorobanRpc: SorobanRpcHealthIndicator,
    private readonly horizon: HorizonHealthIndicator,
    private readonly healthHistory: HealthHistoryService,
  ) {}

  @Get()
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Full application health check',
    description:
      'Comprehensive health check including database, RPC endpoints, and indexer service',
  })
  async check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.rpc.isHealthy('rpc'),
      () => this.indexer.isHealthy('indexer'),
    ]);
  }

  @Get('detailed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detailed health check for all external dependencies',
    description: 'Check status of all external services with response times',
  })
  async detailed() {
    const startTime = Date.now();
    const checks = await Promise.allSettled([
      this.db.isHealthy('database'),
      this.rpc.isHealthy('rpc'),
      this.indexer.isHealthy('indexer'),
      this.redis.isHealthy('redis'),
      this.email.isHealthy('email'),
      this.sorobanRpc.isHealthy('soroban-rpc'),
      this.horizon.isHealthy('horizon'),
    ]);

    const results = checks.map((check, index) => {
      const services = [
        'database',
        'rpc',
        'indexer',
        'redis',
        'email',
        'soroban-rpc',
        'horizon',
      ];
      
      if (check.status === 'fulfilled') {
        return check.value;
      }
      
      return {
        [services[index]]: {
          status: 'down',
          error: check.reason?.message || 'Unknown error',
        },
      };
    });

    const totalTime = Date.now() - startTime;
    const allHealthy = checks.every((c) => c.status === 'fulfilled');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${totalTime}ms`,
      checks: Object.assign({}, ...results),
    };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Simple endpoint for Kubernetes liveness probes',
  })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Readiness check for Kubernetes - validates critical dependencies',
  })
  async ready() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.rpc.isHealthy('rpc'),
    ]);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get health check history',
    description: 'Retrieve historical health check data',
  })
  getHistory(@Query('service') service?: string, @Query('limit') limit: number = 100) {
    return {
      history: this.healthHistory.getHistory(service, limit),
    };
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get health statistics',
    description: 'Get uptime and performance statistics for all services',
  })
  getStats() {
    return this.healthHistory.getAllStats();
  }
}
