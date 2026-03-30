import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../user/entities/user.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';
import { ProcessedStellarEvent } from '../blockchain/entities/processed-event.entity';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';
import { RebalancingExecution } from './entities/rebalancing-execution.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ProcessedStellarEvent,
      LedgerTransaction,
      UserSubscription,
      RebalancingExecution,
    ]),
    BlockchainModule, // Import to use OracleService for USD conversion
    NotificationsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
