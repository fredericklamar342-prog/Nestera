import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';
import { PredictiveEvaluatorService } from './services/predictive-evaluator.service';
import { SavingsProduct } from './entities/savings-product.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SavingsGoal } from './entities/savings-goal.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { WaitlistEvent } from './entities/waitlist-event.entity';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SavingsProduct,
      UserSubscription,
      SavingsGoal,
      WithdrawalRequest,
      Transaction,
      User,
      WaitlistEntry,
      WaitlistEvent,
    ]),
  ],
  controllers: [SavingsController, WaitlistController],
  providers: [SavingsService, PredictiveEvaluatorService, WaitlistService],
  exports: [SavingsService, WaitlistService],
})
export class SavingsModule {}
