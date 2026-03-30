import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { VersionAnalyticsService } from './version-analytics.service';

@Injectable()
export class VersionAnalyticsInterceptor implements NestInterceptor {
  constructor(private readonly versionAnalytics: VersionAnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ url: string }>();
    const match = req.url.match(/\/api\/v(\d+)/);
    if (match?.[1]) {
      this.versionAnalytics.record(match[1]);
    }
    return next.handle().pipe(tap(() => {}));
  }
}
