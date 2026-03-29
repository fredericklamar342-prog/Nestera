import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import {
  MedicalClaim,
  ClaimStatus,
} from '../claims/entities/medical-claim.entity';
import { Dispute, DisputeStatus } from '../disputes/entities/dispute.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { AnalyticsOverviewDto } from './dto/analytics-overview.dto';
import { ProtocolMetrics } from './entities/protocol-metrics.entity';
import { OracleService } from './services/oracle.service';
import { SavingsService } from '../blockchain/savings.service';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(
    @InjectRepository(MedicalClaim)
    private readonly claimRepository: Repository<MedicalClaim>,
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(SavingsProduct)
    private readonly savingsProductRepository: Repository<SavingsProduct>,
    @InjectRepository(ProtocolMetrics)
    private readonly protocolMetricsRepository: Repository<ProtocolMetrics>,
    private readonly oracleService: OracleService,
    private readonly savingsService: SavingsService,
  ) {}

  async getOverview(): Promise<AnalyticsOverviewDto> {
    const [
      totalProcessedSweeps,
      activeDisputes,
      pendingMedicalClaims,
      totalClaims,
      claimAmountResult,
    ] = await Promise.all([
      this.claimRepository.count({
        where: [
          { status: ClaimStatus.APPROVED },
          { status: ClaimStatus.REJECTED },
        ],
      }),
      this.disputeRepository.count({
        where: [
          { status: DisputeStatus.OPEN },
          { status: DisputeStatus.UNDER_REVIEW },
        ],
      }),
      this.claimRepository.count({ where: { status: ClaimStatus.PENDING } }),
      this.claimRepository.count(),
      this.claimRepository
        .createQueryBuilder('claim')
        .select('SUM(claim.claimAmount)', 'total')
        .getRawOne(),
    ]);

    return {
      totalProcessedSweeps,
      activeDisputes,
      pendingMedicalClaims,
      totalUsers: totalClaims,
      totalClaimAmount: parseFloat(claimAmountResult?.total || '0'),
    };
  }

  /**
   * Cron job that runs daily at 12:00 UTC to snapshot global TVL
   * Schedule: 0 0 12 * * * (12:00 UTC every day)
   */
  @Cron('0 0 12 * * *')
  async snapshotGlobalTvl(): Promise<void> {
    this.logger.log('Starting global TVL snapshot job...');

    try {
      // Fetch all active savings products
      const savingsProducts = await this.savingsProductRepository.find({
        where: { isActive: true },
      });

      if (savingsProducts.length === 0) {
        this.logger.warn('No active savings products found');
        return;
      }

      this.logger.log(
        `Found ${savingsProducts.length} active savings products`,
      );

      // Fetch XLM price in USD
      const xlmPriceUsd = await this.oracleService.getAssetPrice('stellar');

      if (xlmPriceUsd === 0) {
        this.logger.error('Failed to fetch XLM price, aborting snapshot');
        return;
      }

      this.logger.log(`Current XLM price: $${xlmPriceUsd}`);

      // Iterate through each savings product and fetch total assets
      let totalValueLockedXlm = 0;
      const productBreakdown: Record<string, any> = {};

      for (const product of savingsProducts) {
        if (!product.contractId) {
          this.logger.warn(
            `Savings product ${product.id} (${product.name}) has no contract ID, skipping`,
          );
          continue;
        }

        try {
          const totalAssets = await this.savingsService.getVaultTotalAssets(
            product.contractId,
          );

          // Convert stroops to XLM
          const totalAssetsXlm = totalAssets / 10_000_000;
          totalValueLockedXlm += totalAssetsXlm;

          productBreakdown[product.id] = {
            name: product.name,
            type: product.type,
            contractId: product.contractId,
            totalAssetsStroops: totalAssets,
            totalAssetsXlm: totalAssetsXlm,
            totalAssetsUsd: totalAssetsXlm * xlmPriceUsd,
          };

          this.logger.log(
            `Product ${product.name}: ${totalAssetsXlm} XLM ($${totalAssetsXlm * xlmPriceUsd})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to fetch total assets for product ${product.id} (${product.name}): ${(error as Error).message}`,
          );
          productBreakdown[product.id] = {
            name: product.name,
            type: product.type,
            contractId: product.contractId,
            error: (error as Error).message,
          };
        }
      }

      // Calculate total value locked in USD
      const totalValueLockedUsd = totalValueLockedXlm * xlmPriceUsd;

      // Create and save protocol metrics snapshot
      const snapshot = this.protocolMetricsRepository.create({
        snapshotDate: new Date(),
        totalValueLockedUsd,
        totalValueLockedXlm,
        savingsProductCount: savingsProducts.length,
        productBreakdown,
      });

      await this.protocolMetricsRepository.save(snapshot);

      this.logger.log(
        `Global TVL snapshot completed: ${totalValueLockedXlm} XLM ($${totalValueLockedUsd})`,
      );
    } catch (error) {
      this.logger.error(
        `Error during global TVL snapshot job: ${(error as Error).message}`,
        error,
      );
    }
  }
}
