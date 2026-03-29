import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsEnum, IsDateString, IsArray } from 'class-validator';
import { PageOptionsDto } from '../../../common/dto/page-options.dto';
import { LedgerTransactionType } from '../../blockchain/entities/transaction.entity';

export class TransactionQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({
    description: 'Filter by transaction types (comma-separated)',
    example: 'DEPOSIT,YIELD',
    enum: LedgerTransactionType,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return value;
  })
  @IsArray()
  @IsEnum(LedgerTransactionType, { each: true })
  readonly type?: LedgerTransactionType[];

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  readonly startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  readonly endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by pool ID',
    example: 'pool-uuid-here',
  })
  @IsOptional()
  readonly poolId?: string;
}
