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
import { AdminDisputesController } from './admin-disputes.controller';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminSavingsService } from './admin-savings.service';
import { AdminDisputesService } from './admin-disputes.service';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { AdminNotificationsService } from './admin-notifications.service';
import { User } from '../user/entities/user.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';
import { Dispute, DisputeTimeline } from '../disputes/entities/dispute.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserSubscription,
      SavingsProduct,
      LedgerTransaction,
      Dispute,
      DisputeTimeline,
      AuditLog,
      Notification,
    ]),
    UserModule,
    SavingsModule,
    MailModule,
    BlockchainModule,
    NotificationsModule,
    EventEmitterModule,
  ],
  controllers: [
    AdminController,
    AdminSavingsController,
    AdminWaitlistController,
    AdminUsersController,
    AdminDisputesController,
    AdminAuditLogsController,
    AdminNotificationsController,
  ],
  providers: [AdminUsersService, AdminSavingsService, AdminDisputesService, AdminAuditLogsService, AdminNotificationsService],
  exports: [AdminDisputesService, AdminAuditLogsService],
})
export class AdminModule {}
