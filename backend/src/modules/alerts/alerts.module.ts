import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { User } from '../user/entities/user.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertHistory } from './entities/alert-history.entity';
import { ProductAlert } from './entities/product-alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductAlert,
      AlertHistory,
      SavingsProduct,
      User,
    ]),
    NotificationsModule,
    MailModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
