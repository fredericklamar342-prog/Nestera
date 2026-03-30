import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private isShuttingDown = false;
  private activeRequests = 0;
  private readonly maxShutdownTimeout = 30000; // 30 seconds

  constructor(
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  incrementActiveRequests(): void {
    if (!this.isShuttingDown) {
      this.activeRequests++;
    }
  }

  decrementActiveRequests(): void {
    this.activeRequests--;
  }

  isShutdown(): boolean {
    return this.isShuttingDown;
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Received shutdown signal: ${signal}`);
    this.isShuttingDown = true;

    const shutdownStartTime = Date.now();

    // Stop accepting new requests
    this.logger.log('Stopping acceptance of new requests');

    // Wait for in-flight requests to complete
    await this.waitForInFlightRequests();

    // Close database connections
    await this.closeDatabase();

    // Close Redis connections
    await this.closeRedis();

    const shutdownDuration = Date.now() - shutdownStartTime;
    this.logger.log(
      `Graceful shutdown completed in ${shutdownDuration}ms`,
    );
  }

  private async waitForInFlightRequests(): Promise<void> {
    const startTime = Date.now();
    const timeout = 25000; // Leave 5 seconds for other cleanup

    while (this.activeRequests > 0) {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        this.logger.warn(
          `Timeout waiting for ${this.activeRequests} in-flight requests. Forcing shutdown.`,
        );
        break;
      }

      this.logger.log(
        `Waiting for ${this.activeRequests} in-flight requests to complete...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.logger.log('All in-flight requests completed');
  }

  private async closeDatabase(): Promise<void> {
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        this.logger.log('Closing database connections...');
        await this.dataSource.destroy();
        this.logger.log('Database connections closed');
      }
    } catch (error) {
      this.logger.error('Error closing database connections:', error);
    }
  }

  private async closeRedis(): Promise<void> {
    try {
      if (this.cacheManager) {
        this.logger.log('Closing Redis connections...');
        await this.cacheManager.reset();
        this.logger.log('Redis connections closed');
      }
    } catch (error) {
      this.logger.error('Error closing Redis connections:', error);
    }
  }
}
