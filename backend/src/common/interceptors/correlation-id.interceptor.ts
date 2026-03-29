import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

/**
 * Correlation ID Interceptor
 * 
 * Generates or forwards request correlation IDs for tracing requests
 * through the entire system (API → DB → listeners → contracts).
 * 
 * - Checks for X-Correlation-ID header
 * - Generates UUID if not present
 * - Attaches to request object for downstream use
 * - Includes in response headers
 * - Logs correlation ID for debugging
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CorrelationIdInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        // Check for existing correlation ID or generate new one
        const correlationId =
            (request.headers['x-correlation-id'] as string) || uuidv4();

        // Attach to request for downstream use
        (request as any).correlationId = correlationId;

        // Add to response headers
        response.setHeader('X-Correlation-ID', correlationId);

        // Log request with correlation ID
        this.logger.debug(
            `[${correlationId}] ${request.method} ${request.url}`,
            'CorrelationId',
        );

        return next.handle();
    }
}
