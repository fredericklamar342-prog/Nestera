import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { TypeOrmHealthIndicator } from './indicators/typeorm.health';
import { IndexerHealthIndicator } from './indicators/indexer.health';
import { RpcHealthIndicator } from './indicators/rpc.health';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { DeadLetterEvent } from '../blockchain/entities/dead-letter-event.entity';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forFeature([DeadLetterEvent]),
    BlockchainModule,
  ],
  controllers: [HealthController],
  providers: [
    TypeOrmHealthIndicator,
    IndexerHealthIndicator,
    RpcHealthIndicator,
  ],
})
export class HealthModule {}
