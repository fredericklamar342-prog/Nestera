import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WithdrawDto {
  @ApiProperty({ description: 'Subscription ID to withdraw from' })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ example: 1000.5, description: 'Amount to withdraw' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    example: 'emergency',
    description: 'Optional reason for withdrawal',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
