import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsOverviewDto {
  @ApiProperty({ example: 150 })
  totalProcessedSweeps: number;

  @ApiProperty({ example: 12 })
  activeDisputes: number;

  @ApiProperty({ example: 25 })
  pendingMedicalClaims: number;

  @ApiProperty({ example: 187 })
  totalUsers: number;

  @ApiProperty({ example: 45000.5 })
  totalClaimAmount: number;
}
