import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsObject,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  SavingsGoalMetadata,
  SavingsGoalStatus,
} from '../entities/savings-goal.entity';

export class UpdateGoalDto {
  @ApiProperty({
    example: 'Buy a Car',
    description: 'Human-readable label for the savings goal',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  goalName?: string;

  @ApiProperty({
    example: 50000,
    description: 'Target amount to accumulate (in XLM)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  targetAmount?: number;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Target date to reach the goal',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  targetDate?: Date;

  @ApiProperty({
    enum: SavingsGoalStatus,
    example: SavingsGoalStatus.COMPLETED,
    description: 'Goal status (IN_PROGRESS or COMPLETED)',
    required: false,
  })
  @IsOptional()
  @IsEnum(SavingsGoalStatus)
  status?: SavingsGoalStatus;

  @ApiProperty({
    example: {
      imageUrl: 'https://cdn.nestera.io/goals/car.jpg',
      iconRef: 'car-icon',
      color: '#4F46E5',
    },
    description:
      'Optional frontend-controlled metadata (imageUrl, iconRef, color, etc.). Pass null to clear.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: SavingsGoalMetadata | null;
}
