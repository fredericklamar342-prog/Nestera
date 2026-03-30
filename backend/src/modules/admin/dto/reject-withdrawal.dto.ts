import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectWithdrawalDto {
  @ApiProperty({
    description: 'Reason for rejecting the withdrawal request',
    example: 'Insufficient documentation provided',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
