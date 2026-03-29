import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TypeOrmHealthIndicator } from './indicators/typeorm.health';
import { IndexerHealthIndicator } from './indicators/indexer.health';
import { RpcHealthIndicator } from './indicators/rpc.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly indexer: IndexerHealthIndicator,
    private readonly rpc: RpcHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Full application health check',
    description:
      'Comprehensive health check including database, RPC endpoints, and indexer service',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        checks: {
          database: {
            status: 'up',
            responseTime: '45ms',
            threshold: '200ms',
          },
          rpc: {
            status: 'up',
            responseTime: '120ms',
            currentEndpoint: 'https://soroban-testnet.stellar.org',
            totalEndpoints: 2,
          },
          indexer: {
            status: 'up',
            timeSinceLastProcess: '3500ms',
            threshold: '15000ms',
            lastProcessedTime: '2026-03-25T10:30:45.123Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more health checks failed',
    schema: {
      example: {
        status: 'error',
        checks: {
          database: {
            status: 'down',
            message: 'Database connection failed',
          },
        },
      },
    },
  })
  async check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.rpc.isHealthy('rpc'),
      () => this.indexer.isHealthy('indexer'),
    ]);
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Simple endpoint for Kubernetes liveness probes',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is running',
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
  @ApiResponse({
    status: 200,
    description: 'Application is ready to serve traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  async ready() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.rpc.isHealthy('rpc'),
    ]);
  }
}
