import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SavingsProductType, RiskLevel } from '../entities/savings-product.entity';

export class SavingsProductDto {
  @ApiProperty({ description: 'Product UUID' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ enum: SavingsProductType, description: 'Product type' })
  type: SavingsProductType;

  @ApiPropertyOptional({ description: 'Product description' })
  description: string | null;

  @ApiProperty({ description: 'Annual interest rate (%)' })
  interestRate: number;

  @ApiProperty({ description: 'Minimum subscription amount' })
  minAmount: number;

  @ApiProperty({ description: 'Maximum subscription amount' })
  maxAmount: number;

  @ApiPropertyOptional({ description: 'Tenure in months' })
  tenureMonths: number | null;

  @ApiPropertyOptional({ description: 'Soroban vault contract ID' })
  contractId: string | null;

  @ApiProperty({ description: 'Whether product is active' })
  isActive: boolean;

  @ApiProperty({
    description: 'Risk level classification (e.g. Low, Medium, High)',
    enum: RiskLevel,
  })
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Total Value Locked (aggregated local balance)' })
  tvlAmount: number;

  @ApiProperty({ description: 'Product creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Product last update timestamp' })
  updatedAt: Date;
}
