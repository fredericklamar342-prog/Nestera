import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AdminUsersQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['USER', 'ADMIN'] })
  @IsEnum(['USER', 'ADMIN'])
  @IsOptional()
  role?: 'USER' | 'ADMIN';

  @ApiPropertyOptional({
    enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
  })
  @IsEnum(['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'])
  @IsOptional()
  kycStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'ISO 8601 — registrations from this date',
  })
  @IsISO8601()
  @IsOptional()
  registeredFrom?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 — registrations up to this date',
  })
  @IsISO8601()
  @IsOptional()
  registeredTo?: string;

  @ApiPropertyOptional({
    enum: ['active', 'inactive'],
    description: 'Account status',
  })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive';

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}
