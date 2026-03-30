import {
  Controller,
  Post,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { BackupService } from './backup.service';
import { BackupRestoreTestService } from './backup-restore-test.service';

@ApiTags('backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller({ path: 'backup', version: '1' })
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly restoreTestService: BackupRestoreTestService,
  ) {}

  @Post('trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger an on-demand backup (admin)' })
  async triggerBackup() {
    const record = await this.backupService.createBackup();
    return {
      backupId: record.id,
      status: record.status,
      sizeBytes: record.sizeBytes,
      durationMs: record.durationMs,
    };
  }

  @Post('restore-test')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger an on-demand restore test (admin)' })
  async triggerRestoreTest() {
    await this.restoreTestService.runMonthlyRestoreTest();
    return { message: 'Restore test initiated' };
  }

  @Get('records')
  @ApiOperation({ summary: 'List recent backup records with metrics (admin)' })
  async getRecords() {
    return this.backupService.getRecentBackups(20);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get last successful backup info (admin)' })
  async getStatus() {
    const last = await this.backupService.getLastSuccessful();
    if (!last) return { healthy: false, message: 'No successful backup found' };
    const ageHours = (Date.now() - last.createdAt.getTime()) / 1000 / 3600;
    return {
      healthy: ageHours < 26,
      lastBackupAt: last.createdAt,
      ageHours: +ageHours.toFixed(2),
      sizeBytes: last.sizeBytes,
      durationMs: last.durationMs,
    };
  }
}
