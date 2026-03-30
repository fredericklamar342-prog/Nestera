import { Global, Module } from '@nestjs/common';
import { PiiEncryptionService } from './services/pii-encryption.service';
import { RateLimitMonitorService } from './services/rate-limit-monitor.service';

@Global()
@Module({
  providers: [RateLimitMonitorService, PiiEncryptionService],
  exports: [RateLimitMonitorService, PiiEncryptionService],
})
export class CommonModule {}
