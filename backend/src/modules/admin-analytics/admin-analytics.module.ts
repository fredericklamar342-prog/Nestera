import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { OracleService } from './services/oracle.service';
import { MedicalClaim } from '../claims/entities/medical-claim.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { ProtocolMetrics } from './entities/protocol-metrics.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { User } from '../user/entities/user.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicalClaim,
      Dispute,
      SavingsProduct,
      ProtocolMetrics,
      User,
      UserSubscription,
      Transaction,
    ]),
    HttpModule,
    BlockchainModule,
  ],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService, OracleService],
  exports: [AdminAnalyticsService, OracleService],
})
export class AdminAnalyticsModule {}
