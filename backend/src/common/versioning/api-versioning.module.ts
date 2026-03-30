import { Module } from '@nestjs/common';
import { VersionAnalyticsService } from './version-analytics.service';
import { VersionAnalyticsInterceptor } from './version-analytics.interceptor';
import { VersioningController } from './versioning.controller';

@Module({
  controllers: [VersioningController],
  providers: [VersionAnalyticsService, VersionAnalyticsInterceptor],
  exports: [VersionAnalyticsService, VersionAnalyticsInterceptor],
})
export class ApiVersioningModule {}
