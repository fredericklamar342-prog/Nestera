import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SavingsProductType, RiskLevel } from '../entities/savings-product.entity';

/**
 * Detailed product response combining static DB attributes with live Soroban contract data
 */
export class ProductDetailsDto {
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

  @ApiProperty({ description: 'Whether product is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Soroban vault contract ID' })
  contractId: string | null;

  @ApiProperty({
    description: 'Live total assets from Soroban contract (in stroops)',
  })
  totalAssets: number;

  @ApiProperty({ description: 'Live total assets formatted as XLM' })
  totalAssetsXlm: number;

  @ApiProperty({ description: 'Product creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Risk level classification', enum: RiskLevel })
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Product last update timestamp' })
  updatedAt: Date;
}
