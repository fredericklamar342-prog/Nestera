import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReferralStatus } from '../entities/referral.entity';

export class CreateReferralDto {
  @ApiPropertyOptional({ description: 'Campaign ID to associate with this referral' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

export class ApplyReferralCodeDto {
  @ApiProperty({ description: 'Referral code to apply during signup' })
  @IsString()
  referralCode: string;
}

export class ReferralStatsDto {
  @ApiProperty()
  totalReferrals: number;

  @ApiProperty()
  pendingReferrals: number;

  @ApiProperty()
  completedReferrals: number;

  @ApiProperty()
  rewardedReferrals: number;

  @ApiProperty()
  totalRewardsEarned: string;

  @ApiProperty()
  referralCode: string;
}

export class ReferralResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  referralCode: string;

  @ApiProperty({ enum: ReferralStatus })
  status: ReferralStatus;

  @ApiProperty({ required: false })
  rewardAmount?: string;

  @ApiProperty({ required: false })
  refereeEmail?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  rewardedAt?: Date;
}

export class UpdateReferralStatusDto {
  @ApiProperty({ enum: ReferralStatus })
  @IsEnum(ReferralStatus)
  status: ReferralStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardAmount?: number;
}
