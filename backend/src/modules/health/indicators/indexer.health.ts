import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { IndexerService } from '../../blockchain/indexer.service';

/**
 * Indexer Health Indicator
 * Validates that the indexer service has processed a ledger within the last 15 seconds
 * ensuring no background task halting
 */
@Injectable()
export class IndexerHealthIndicator extends HealthIndicator {
  private readonly LEDGER_PROCESSING_THRESHOLD_MS = 15000; // 15 seconds

  constructor(private readonly indexerService: IndexerService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const lastProcessedTime = this.indexerService.getLastProcessedTimestamp();

      if (lastProcessedTime === null) {
        // Indexer hasn't processed any ledger yet
        const result = this.getStatus(key, false, {
          message: 'No ledger processed yet',
          lastProcessedTime: 'never',
        });

        throw new HealthCheckError(
          'Indexer has not processed any ledger',
          result,
        );
      }

      const timeSinceLastProcess = Date.now() - lastProcessedTime;
      const isHealthy =
        timeSinceLastProcess <= this.LEDGER_PROCESSING_THRESHOLD_MS;

      const result = this.getStatus(key, isHealthy, {
        timeSinceLastProcess: `${timeSinceLastProcess}ms`,
        threshold: `${this.LEDGER_PROCESSING_THRESHOLD_MS}ms`,
        lastProcessedTime: new Date(lastProcessedTime).toISOString(),
      });

      if (!isHealthy) {
        throw new HealthCheckError(
          `Indexer has not processed a ledger within the last ${this.LEDGER_PROCESSING_THRESHOLD_MS}ms (last: ${timeSinceLastProcess}ms ago)`,
          result,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }

      const result = this.getStatus(key, false, {
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new HealthCheckError('Indexer health check failed', result);
    }
  }
}
