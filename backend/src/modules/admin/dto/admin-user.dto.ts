import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminUserListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() name?: string;
  @ApiProperty() role: string;
  @ApiProperty() kycStatus: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() totalSavings: number;
  @ApiProperty() transactionCount: number;
  @ApiPropertyOptional() lastLoginAt?: Date;
  @ApiProperty() createdAt: Date;
}

export class AdminUserDetailDto extends AdminUserListItemDto {
  @ApiPropertyOptional() bio?: string;
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiPropertyOptional() publicKey?: string;
  @ApiPropertyOptional() walletAddress?: string;
  @ApiProperty() tier: string;
  @ApiProperty() twoFactorEnabled: boolean;
  @ApiProperty() activeSubscriptions: number;
  @ApiProperty() totalInterestEarned: number;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['USER', 'ADMIN'] })
  @IsEnum(['USER', 'ADMIN'])
  @IsNotEmpty()
  role: 'USER' | 'ADMIN';
}

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'true = active, false = deactivated' })
  @IsNotEmpty()
  isActive: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkActionDto {
  @ApiProperty({ enum: ['activate', 'deactivate', 'export', 'email'] })
  @IsEnum(['activate', 'deactivate', 'export', 'email'])
  @IsNotEmpty()
  action: 'activate' | 'deactivate' | 'export' | 'email';

  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  @IsNotEmpty()
  userIds: string[];

  @ApiPropertyOptional({ description: 'Required when action=email' })
  @IsString()
  @IsOptional()
  emailSubject?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emailBody?: string;
}
