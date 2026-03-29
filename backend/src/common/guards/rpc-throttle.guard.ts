import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * RpcThrottleGuard - Specialized throttler for high-cost RPC operations
 *
 * This guard enforces strict rate limiting on endpoints that trigger live RPC calls
 * to Soroban/Horizon nodes. It uses User ID as the throttle key to prevent abuse
 * while allowing different users to operate independently.
 *
 * Configuration:
 * - GET /savings/my-subscriptions: 10 requests per minute per User ID
 * - Other RPC endpoints: configurable via decorator
 *
 * Key Features:
 * - User-ID based tracking (when authenticated) to prevent IP-shifting bypasses
 * - IP fallback for unauthenticated RPC calls
 * - Automatic Retry-After and X-RateLimit header injection
 * - Custom error messages with limit/TTL information
 */
@Injectable()
export class RpcThrottleGuard extends ThrottlerGuard {
  private readonly logger = new Logger(RpcThrottleGuard.name);

  /**
   * Override getTracker to use User ID instead of IP address
   * This ensures rate limiting is per-user, not per-IP
   *
   * Prioritization:
   * 1. If user is authenticated (has req.user.id), use User ID
   * 2. Otherwise fall back to IP address
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Extract user ID from JWT token in request (set by JwtAuthGuard)
    const user = req.user;

    if (user && user.id) {
      // Use User ID for authenticated requests
      return `rpc-throttle:${user.id}`;
    }

    // Fallback to IP for unauthenticated requests
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    this.logger.debug(
      `RpcThrottleGuard: Using IP-based tracking for ${req.method} ${req.path} (IP: ${ip})`,
    );
    return `rpc-throttle:${ip}`;
  }

  /**
   * Override onLimitExceeded to throw ThrottlerException (429)
   * This integrates seamlessly with NestJS error handling
   */
  async onLimitExceeded(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const user = (request as any).user;

    // Log the rate limit breach
    this.logger.warn(
      `[RPC Rate Limit] User/IP: ${user?.id || request.ip || 'unknown'} | ` +
        `Route: ${request.method} ${request.path} | ` +
        `Limit: ${limit} req/${Math.round(ttl / 1000)}s`,
    );

    // Set Retry-After header (standard HTTP 429 behavior)
    response.setHeader('Retry-After', Math.ceil(ttl / 1000));
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', 0);
    response.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + ttl).toISOString(),
    );

    // Throw ThrottlerException which results in HTTP 429
    throw new ThrottlerException(
      `Too many RPC requests. Maximum ${limit} requests per ${Math.round(ttl / 1000)} seconds allowed.`,
    );
  }
}
