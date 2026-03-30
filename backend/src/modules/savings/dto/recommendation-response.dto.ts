import { ApiProperty } from '@nestjs/swagger';

export class ProductRecommendationDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ example: 'High-Yield Locked Savings' })
  productName: string;

  @ApiProperty({
    example: 0.92,
    description: 'Match score from 0 to 1',
  })
  matchScore: number;

  @ApiProperty({
    example: 'Matches your 12-month emergency fund goal',
    description: 'Human-readable reason for the recommendation',
  })
  reason: string;

  @ApiProperty({
    example: 1250.0,
    description: 'Projected earnings based on user behavior',
  })
  projectedEarnings: number;
}

export class RecommendationResponseDto {
  @ApiProperty({ type: [ProductRecommendationDto] })
  recommendations: ProductRecommendationDto[];
}
