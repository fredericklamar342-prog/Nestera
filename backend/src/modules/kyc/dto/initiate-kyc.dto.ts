import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KycProvider } from '../entities/kyc-verification.entity';

export class InitiateKycDto {
  @ApiProperty({ enum: KycProvider, default: KycProvider.SUMSUB })
  @IsEnum(KycProvider)
  provider!: KycProvider;

  @ApiPropertyOptional({
    description: 'Government ID number (encrypted at rest)',
  })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional({
    description: 'Document type (passport, national_id, etc.)',
  })
  @IsOptional()
  @IsString()
  documentType?: string;
}
