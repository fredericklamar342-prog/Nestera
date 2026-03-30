import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { KycComplianceReport } from './entities/kyc-compliance-report.entity';
import { KycVerification } from './entities/kyc-verification.entity';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycVerification, KycComplianceReport, User]),
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
