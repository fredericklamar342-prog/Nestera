import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { BackupRecord } from './entities/backup-record.entity';
import { BackupService } from './backup.service';
import { BackupRestoreTestService } from './backup-restore-test.service';
import { BackupMonitorService } from './backup-monitor.service';
import { BackupController } from './backup.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BackupRecord]), MailModule],
  controllers: [BackupController],
  providers: [BackupService, BackupRestoreTestService, BackupMonitorService],
  exports: [BackupService],
})
export class BackupModule {}
