import { Module } from '@nestjs/common';
import { QueryLoggerService } from './query-logger.service';
import { PerformanceController } from './performance.controller';

@Module({
  providers: [QueryLoggerService],
  controllers: [PerformanceController],
  exports: [QueryLoggerService],
})
export class PerformanceModule {}
