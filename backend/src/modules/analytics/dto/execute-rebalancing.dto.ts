import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ExecuteRebalancingDto {
  @ApiPropertyOptional({
    enum: ['conservative', 'balanced', 'growth'],
    default: 'balanced',
  })
  @IsOptional()
  @IsIn(['conservative', 'balanced', 'growth'])
  riskProfile?: 'conservative' | 'balanced' | 'growth';
}
