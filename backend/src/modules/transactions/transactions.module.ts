import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';
import { TransactionFormattingInterceptor } from '../../common/interceptors/transaction-formatting.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerTransaction])],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransactionFormattingInterceptor,
    },
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
