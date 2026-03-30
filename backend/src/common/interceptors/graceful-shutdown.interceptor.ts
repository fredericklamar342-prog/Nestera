import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { GracefulShutdownService } from '../services/graceful-shutdown.service';

@Injectable()
export class GracefulShutdownInterceptor implements NestInterceptor {
  constructor(private gracefulShutdown: GracefulShutdownService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Reject new requests during shutdown
    if (this.gracefulShutdown.isShutdown()) {
      const response = context.switchToHttp().getResponse();
      response.status(503).json({
        statusCode: 503,
        message: 'Service is shutting down',
      });
      return;
    }

    this.gracefulShutdown.incrementActiveRequests();

    return next.handle().pipe(
      finalize(() => {
        this.gracefulShutdown.decrementActiveRequests();
      }),
    );
  }
}
