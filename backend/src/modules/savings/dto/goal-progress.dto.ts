import { ApiProperty } from '@nestjs/swagger';
import {
  SavingsGoalStatus,
  SavingsGoalMetadata,
} from '../entities/savings-goal.entity';

/**
 * Goal Progress DTO with Chronological Predictive Evaluator
 *
 * Enriches goal data with:
 * - Current balance and progress percentage
 * - Predictive evaluation: isOffTrack flag based on yield projections
 * - Explicit warning mapping for users not meeting deadlines
 */
export class GoalProgressDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier for the savings goal',
  })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'User ID who owns this goal',
  })
  userId: string;

  @ApiProperty({
    example: 'Buy a Car',
    description: 'Human-readable goal name',
  })
  goalName: string;

  @ApiProperty({
    example: 50000,
    description: 'Target amount to accumulate (in XLM)',
  })
  targetAmount: number;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Target date to reach the goal',
  })
  targetDate: Date;

  @ApiProperty({
    enum: ['IN_PROGRESS', 'COMPLETED'],
    description: 'Current status of the goal',
  })
  status: SavingsGoalStatus;

  @ApiProperty({
    example: {
      imageUrl: 'https://cdn.nestera.io/goals/car.jpg',
      iconRef: 'car-icon',
      color: '#4F46E5',
    },
    description: 'Optional frontend-controlled metadata',
    required: false,
  })
  metadata: SavingsGoalMetadata | null;

  @ApiProperty({
    example: '2026-01-15T10:30:00Z',
    description: 'When the goal was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-01-15T10:30:00Z',
    description: 'When the goal was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    example: 25000,
    description: 'Current balance accumulated towards this goal (in XLM)',
  })
  currentBalance: number;

  @ApiProperty({
    example: 50,
    description: 'Percentage of target amount already accumulated (0-100)',
  })
  percentageComplete: number;

  @ApiProperty({
    example: 30000,
    description:
      'Projected balance at target date based on current yield (in XLM)',
  })
  projectedBalance: number;

  @ApiProperty({
    example: true,
    description:
      'Chronological predictive flag: true if projected balance < targetAmount by deadline',
  })
  isOffTrack: boolean;

  @ApiProperty({
    example: 20000,
    description:
      'Gap between target and projected balance (negative if on track)',
  })
  projectionGap: number;

  @ApiProperty({
    example: 2.5,
    description: 'Annualized yield rate used for projection (%)',
  })
  appliedYieldRate: number;
}
