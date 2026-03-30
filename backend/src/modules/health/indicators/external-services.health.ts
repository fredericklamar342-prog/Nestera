import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      return this.getStatus(key, false, {
        message: 'Redis not configured',
      });
    }

    const startTime = Date.now();
    try {
      // Simple ping test
      const response = await axios.get(redisUrl, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Redis health check failed: ${error}`);
      
      return this.getStatus(key, false, {
        responseTime: `${responseTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

@Injectable()
export class EmailServiceHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(EmailServiceHealthIndicator.name);

  constructor(private configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const mailHost = this.configService.get<string>('MAIL_HOST');
    
    if (!mailHost) {
      return this.getStatus(key, false, {
        message: 'Email service not configured',
      });
    }

    const startTime = Date.now();
    try {
      // Test SMTP connection
      const response = await axios.get(`http://${mailHost}:25`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.warn(`Email service health check failed: ${error}`);
      
      return this.getStatus(key, false, {
        responseTime: `${responseTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

@Injectable()
export class SorobanRpcHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(SorobanRpcHealthIndicator.name);

  constructor(private configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const rpcUrl = this.configService.get<string>('SOROBAN_RPC_URL');
    
    if (!rpcUrl) {
      return this.getStatus(key, false, {
        message: 'Soroban RPC not configured',
      });
    }

    const startTime = Date.now();
    try {
      const response = await axios.post(
        rpcUrl,
        { jsonrpc: '2.0', method: 'getHealth', params: [], id: 1 },
        { timeout: 10000 },
      );
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.data?.result?.status === 'healthy';
      
      return this.getStatus(key, isHealthy, {
        responseTime: `${responseTime}ms`,
        status: response.data?.result?.status,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Soroban RPC health check failed: ${error}`);
      
      return this.getStatus(key, false, {
        responseTime: `${responseTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

@Injectable()
export class HorizonHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(HorizonHealthIndicator.name);

  constructor(private configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const horizonUrl = this.configService.get<string>('HORIZON_URL');
    
    if (!horizonUrl) {
      return this.getStatus(key, false, {
        message: 'Horizon not configured',
      });
    }

    const startTime = Date.now();
    try {
      const response = await axios.get(`${horizonUrl}/health`, { timeout: 10000 });
      const responseTime = Date.now() - startTime;
      
      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Horizon health check failed: ${error}`);
      
      return this.getStatus(key, false, {
        responseTime: `${responseTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
