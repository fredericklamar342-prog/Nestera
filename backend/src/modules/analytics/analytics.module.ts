import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { User } from '../user/entities/user.entity';
import { ProcessedStellarEvent } from '../blockchain/entities/processed-event.entity';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';

@Module({
  imports: [
    BlockchainModule,
    TypeOrmModule.forFeature([User, ProcessedStellarEvent, LedgerTransaction]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
