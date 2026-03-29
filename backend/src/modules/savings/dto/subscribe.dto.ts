import { IsUUID, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStellarPublicKey } from '../../../common/validators/is-stellar-key.validator';

export class SubscribeDto {
  @ApiProperty({ description: 'Savings product ID to subscribe to' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 5000, description: 'Amount to subscribe' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    example: 'GABCDEF234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHJKLMN',
    description:
      'Optional Stellar wallet address associated with this subscription',
  })
  @IsOptional()
  @IsStellarPublicKey()
  walletAddress?: string;
}
