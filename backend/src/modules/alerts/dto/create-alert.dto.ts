import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { AlertType } from '../entities/product-alert.entity';

export class CreateAlertDto {
  @ApiProperty({ enum: AlertType })
  @IsEnum(AlertType)
  type!: AlertType;

  @ApiProperty({ description: 'Alert conditions object' })
  @IsObject()
  conditions!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional template key' })
  @IsOptional()
  template?: string;
}
