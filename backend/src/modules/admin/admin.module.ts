import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { SavingsModule } from '../savings/savings.module';
import { MailModule } from '../mail/mail.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AdminController } from './admin.controller';
import { AdminSavingsController } from './admin-savings.controller';
import { AdminWaitlistController } from './admin-waitlist.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminWithdrawalController } from './admin-withdrawal.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminSavingsService } from './admin-savings.service';
import { AdminWithdrawalService } from './admin-withdrawal.service';
import { User } from '../user/entities/user.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';
import { WithdrawalRequest } from '../savings/entities/withdrawal-request.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserSubscription,
      SavingsProduct,
      LedgerTransaction,
      WithdrawalRequest,
      AuditLog,
    ]),
    UserModule,
    SavingsModule,
    MailModule,
    BlockchainModule,
  ],
  controllers: [
    AdminController,
    AdminSavingsController,
    AdminWaitlistController,
    AdminUsersController,
    AdminWithdrawalController,
  ],
  providers: [AdminUsersService, AdminSavingsService, AdminWithdrawalService],
})
export class AdminModule {}
