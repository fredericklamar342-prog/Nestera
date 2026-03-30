import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateAlertDto } from './dto/create-alert.dto';
import { SnoozeAlertDto } from './dto/snooze-alert.dto';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create product alert or watch' })
  @ApiResponse({ status: 201, description: 'Alert created' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateAlertDto) {
    return this.alertsService.createAlert(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List active alerts for current user' })
  list(@CurrentUser() user: { id: string }) {
    return this.alertsService.getUserAlerts(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get alert history' })
  history(@CurrentUser() user: { id: string }) {
    return this.alertsService.getAlertHistory(user.id);
  }

  @Patch(':id/snooze')
  @ApiOperation({ summary: 'Snooze an alert' })
  snooze(
    @CurrentUser() user: { id: string },
    @Param('id') alertId: string,
    @Body() dto: SnoozeAlertDto,
  ) {
    return this.alertsService.snoozeAlert(user.id, alertId, dto.hours);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disable an alert' })
  disable(@CurrentUser() user: { id: string }, @Param('id') alertId: string) {
    return this.alertsService.disableAlert(user.id, alertId);
  }

  @Get('templates/common')
  @ApiOperation({ summary: 'Common alert templates' })
  templates() {
    return this.alertsService.alertTemplates();
  }
}
