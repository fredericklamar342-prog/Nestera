import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { throwError } from 'rxjs';

/**
 * Audit Log Interceptor
 * 
 * Logs structured audit entries for trade and dispute mutations.
 * Captures:
 * - Request ID (correlation ID)
 * - Endpoint and HTTP method
 * - Actor wallet/user
 * - Trade/Dispute ID from params or body
 * - Request/response status
 * - Timestamp
 * 
 * Enables forensic traceability for incident debugging.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditLogInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        // Extract correlation ID from request
        const correlationId = (request as any).correlationId || 'unknown';

        // Determine if this is a mutation endpoint (POST, PATCH, PUT, DELETE)
        const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(
            request.method,
        );

        // Extract audit-relevant paths
        const isMutationEndpoint =
            isMutation &&
            (request.url.includes('/claims') ||
                request.url.includes('/disputes') ||
                request.url.includes('/trades'));

        if (!isMutationEndpoint) {
            return next.handle();
        }

        const startTime = Date.now();
        const auditEntry = this.buildAuditEntry(request, correlationId);

        return next.handle().pipe(
            tap((data) => {
                const duration = Date.now() - startTime;
                this.logAuditEntry({
                    ...auditEntry,
                    status: response.statusCode,
                    duration,
                    success: true,
                });
            }),
            catchError((error) => {
                const duration = Date.now() - startTime;
                this.logAuditEntry({
                    ...auditEntry,
                    status: error.status || 500,
                    duration,
                    success: false,
                    error: error.message,
                });
                return throwError(() => error);
            }),
        );
    }

    private buildAuditEntry(request: Request, correlationId: string) {
        const body = request.body || {};
        const params = request.params || {};

        // Extract resource IDs
        const tradeId = params.id || body.tradeId || body.claimId || null;
        const disputeId = params.id || body.disputeId || null;
        const resourceId = tradeId || disputeId;

        // Extract actor (wallet or user email)
        const actor =
            body.actor ||
            body.wallet ||
            body.email ||
            (request.user as any)?.email ||
            'anonymous';

        // Determine action type
        const action = this.getActionType(request.method, request.url);

        return {
            correlationId,
            timestamp: new Date().toISOString(),
            endpoint: request.url,
            method: request.method,
            action,
            actor,
            resourceId,
            resourceType: this.getResourceType(request.url),
        };
    }

    private getActionType(method: string, url: string): string {
        if (method === 'POST') return 'CREATE';
        if (method === 'PATCH' || method === 'PUT') return 'UPDATE';
        if (method === 'DELETE') return 'DELETE';
        return 'UNKNOWN';
    }

    private getResourceType(url: string): string {
        if (url.includes('/claims')) return 'CLAIM';
        if (url.includes('/disputes')) return 'DISPUTE';
        if (url.includes('/trades')) return 'TRADE';
        return 'UNKNOWN';
    }

    private logAuditEntry(entry: any) {
        const logMessage = `[AUDIT] ${entry.correlationId} | ${entry.action} ${entry.resourceType} | Actor: ${entry.actor} | Resource: ${entry.resourceId} | Status: ${entry.status} | Duration: ${entry.duration}ms`;

        if (entry.success) {
            this.logger.log(logMessage);
        } else {
            this.logger.error(
                `${logMessage} | Error: ${entry.error}`,
                'AuditLog',
            );
        }

        // Structured logging for log aggregation systems
        this.logger.debug(JSON.stringify(entry), 'AuditLogStructured');
    }
}
