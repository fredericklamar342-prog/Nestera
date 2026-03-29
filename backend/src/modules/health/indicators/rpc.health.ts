import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { StellarService } from '../../blockchain/stellar.service';

/**
 * RPC Health Indicator
 * Validates that RPC endpoints are accessible and responsive
 */
@Injectable()
export class RpcHealthIndicator extends HealthIndicator {
  private readonly RPC_TIMEOUT_MS = 5000; // 5 seconds timeout for health check

  constructor(private readonly stellarService: StellarService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Get RPC endpoint status
      const endpointStatus = this.stellarService.getEndpointsStatus();

      if (
        !endpointStatus.rpc.endpoints ||
        endpointStatus.rpc.endpoints.length === 0
      ) {
        const result = this.getStatus(key, false, {
          message: 'No RPC endpoints configured',
        });

        throw new HealthCheckError('No RPC endpoints configured', result);
      }

      // Attempt a simple RPC call with timeout
      const rpcServer = this.stellarService.getRpcServer();
      const healthPromise = rpcServer.getHealth();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `RPC health check timeout after ${this.RPC_TIMEOUT_MS}ms`,
              ),
            ),
          this.RPC_TIMEOUT_MS,
        ),
      );

      await Promise.race([healthPromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;

      const result = this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
        currentEndpoint: endpointStatus.rpc.currentUrl,
        totalEndpoints: endpointStatus.rpc.endpoints.length,
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result = this.getStatus(key, false, {
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${responseTime}ms`,
      });

      throw new HealthCheckError('RPC health check failed', result);
    }
  }
}
