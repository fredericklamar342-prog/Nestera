import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { DataSource } from 'typeorm';

/**
 * Custom TypeORM Health Indicator
 * Ensures database connectivity and query performance within acceptable bounds (~200ms)
 */
@Injectable()
export class TypeOrmHealthIndicator extends HealthIndicator {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Execute a simple query to verify database connectivity
      await this.dataSource.query('SELECT 1');

      const responseTime = Date.now() - startTime;
      const isWithinBounds = responseTime <= 200; // ~200ms threshold

      const result = this.getStatus(key, isWithinBounds, {
        responseTime: `${responseTime}ms`,
        threshold: '200ms',
      });

      if (!isWithinBounds) {
        throw new HealthCheckError(
          `Database query exceeded acceptable response time (${responseTime}ms > 200ms)`,
          result,
        );
      }

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result = this.getStatus(key, false, {
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${responseTime}ms`,
      });

      throw new HealthCheckError('Database health check failed', result);
    }
  }
}
