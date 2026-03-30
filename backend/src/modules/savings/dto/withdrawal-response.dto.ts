import { ApiProperty } from '@nestjs/swagger';

export class WithdrawalResponseDto {
  @ApiProperty({ description: 'Withdrawal request ID' })
  withdrawalId: string;

  @ApiProperty({ example: 1000.5, description: 'Requested withdrawal amount' })
  amount: number;

  @ApiProperty({
    example: 50.25,
    description: 'Early withdrawal penalty amount',
  })
  penalty: number;

  @ApiProperty({
    example: 950.25,
    description: 'Net amount after penalty deduction',
  })
  netAmount: number;

  @ApiProperty({ example: 'pending', description: 'Withdrawal request status' })
  status: string;

  @ApiProperty({
    example: '2026-03-29T10:00:00Z',
    description: 'Estimated completion time',
  })
  estimatedCompletionTime: string;
}
