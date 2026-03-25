import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ProcessedStellarEvent } from '../blockchain/entities/processed-event.entity';
import { SavingsService as BlockchainSavingsService } from '../blockchain/savings.service';
import { StellarService } from '../blockchain/stellar.service';
import { PortfolioTimeframe } from './dto/portfolio-timeline-query.dto';
import {
  AssetAllocationDto,
  AssetAllocationItemDto,
} from './dto/asset-allocation.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProcessedStellarEvent)
    private readonly eventRepository: Repository<ProcessedStellarEvent>,
    private readonly blockchainSavingsService: BlockchainSavingsService,
    private readonly stellarService: StellarService,
  ) {}

  /**
   * Reconstructs the historical net worth timeline by working backward
   * from the current live balance using transaction events.
   */
  async getPortfolioTimeline(userId: string, timeframe: PortfolioTimeframe) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'publicKey'],
    });

    if (!user || !user.publicKey) {
      return [];
    }

    // 1. Get current balance (anchor)
    const currentSavings = await this.blockchainSavingsService.getUserSavingsBalance(user.publicKey);
    const currentTotal = currentSavings.total;

    // 2. Define intervals based on timeframe
    const now = new Date();
    let startDate: Date;
    let intervalMs: number;
    let points: number;

    switch (timeframe) {
      case PortfolioTimeframe.DAY:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        intervalMs = 60 * 60 * 1000; // 1 hour
        points = 24;
        break;
      case PortfolioTimeframe.WEEK:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        points = 7;
        break;
      case PortfolioTimeframe.MONTH:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        points = 30;
        break;
      case PortfolioTimeframe.YTD:
        startDate = new Date(now.getFullYear(), 0, 1);
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        points = Math.ceil((now.getTime() - startDate.getTime()) / intervalMs);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervalMs = 24 * 60 * 60 * 1000;
        points = 7;
    }

    // 3. Fetch all events for the user in this timeframe
    const events = await this.eventRepository.find({
      where: {
        processedAt: Between(startDate, now),
      },
      order: { processedAt: 'DESC' },
    });

    // Mock filtering for the user based on public key in eventData
    const userEvents = events.filter(event => {
        const xdr = JSON.stringify(event.eventData);
        return xdr.includes(user.publicKey!);
    });

    // 4. Group events by period and calculate net change per period
    const timeline: { date: string; value: number }[] = [];
    let runningBalance = currentTotal;

    for (let i = 0; i < points; i++) {
        const periodEnd = new Date(now.getTime() - i * intervalMs);
        const periodStart = new Date(now.getTime() - (i + 1) * intervalMs);

        const periodEvents = userEvents.filter(e => 
            e.processedAt <= periodEnd && e.processedAt > periodStart
        );

        let netChange = 0;
        for (const event of periodEvents) {
            const amount = this.extractAmount(event);
            if (event.eventType.toLowerCase().includes('deposit') || 
                event.eventType.toLowerCase().includes('interest')) {
                netChange += amount;
            } else if (event.eventType.toLowerCase().includes('withdraw')) {
                netChange -= amount;
            }
        }

        timeline.push({
            date: this.formatDate(periodEnd, timeframe),
            value: runningBalance,
        });

        runningBalance -= netChange;
    }

    return timeline.reverse();
  }

  /**
   * Aggregates all token balances for a user's Stellar account and returns
   * each asset's share of the total portfolio, sorted highest-first.
   */
  async getAssetAllocation(publicKey: string): Promise<AssetAllocationDto> {
    const horizonServer = this.stellarService.getHorizonServer();

    let account: any;

    try {
      account = await horizonServer.accounts().accountId(publicKey).call();
    } catch (error) {
      this.logger.warn(
        `Could not fetch account ${publicKey}: ${error.message}`,
      );
      return { allocations: [], total: 0 };
    }

    const holdingsMap = new Map<string, number>();

    for (const balance of account.balances) {
      const assetId =
        balance.asset_type === 'native'
          ? 'XLM'
          : (balance as { asset_code: string }).asset_code;

      const amount = parseFloat(balance.balance);
      if (amount <= 0) continue;

      holdingsMap.set(assetId, (holdingsMap.get(assetId) ?? 0) + amount);
    }

    if (holdingsMap.size === 0) {
      return { allocations: [], total: 0 };
    }

    const total = [...holdingsMap.values()].reduce((sum, v) => sum + v, 0);

    const allocations: AssetAllocationItemDto[] = [...holdingsMap.entries()]
      .map(([assetId, amount]) => ({
        assetId,
        amount: parseFloat(amount.toFixed(7)),
        percentage: parseFloat(((amount / total) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return { allocations, total: parseFloat(total.toFixed(7)) };
  }

  private extractAmount(event: ProcessedStellarEvent): number {
    try {
        const data = event.eventData as any;
        return data.amount || 0; 
    } catch (e) {
        return 0;
    }
  }

  private formatDate(date: Date, timeframe: PortfolioTimeframe): string {
    if (timeframe === PortfolioTimeframe.DAY) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
  }
}
