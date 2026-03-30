import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SavingsProductType,
  RiskLevel,
} from '../entities/savings-product.entity';

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

  @ApiPropertyOptional({
    description: 'Maximum active subscriptions allowed per user',
  })
  maxSubscriptionsPerUser: number | null;
  @ApiProperty({ description: 'Current product version' })
  version: number;

  @ApiPropertyOptional({ description: 'Soroban vault contract ID' })
  contractId: string | null;

  @ApiProperty({
    description: 'Live total assets from Soroban contract (in stroops)',
  })
  totalAssets: number;

  @ApiProperty({ description: 'Live total assets formatted as XLM' })
  totalAssetsXlm: number;

  @ApiPropertyOptional({
    description: 'Maximum liquidity-backed capacity for the product',
  })
  maxCapacity: number | null;

  @ApiProperty({ description: 'Current utilized capacity amount' })
  utilizedCapacity: number;

  @ApiProperty({ description: 'Remaining capacity amount' })
  availableCapacity: number;

  @ApiProperty({ description: 'Capacity utilization percentage' })
  utilizationPercentage: number;

  @ApiProperty({ description: 'Whether the product is fully utilized' })
  isFull: boolean;

  @ApiProperty({ description: 'Product creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Risk level classification', enum: RiskLevel })
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Product last update timestamp' })
  updatedAt: Date;
}
