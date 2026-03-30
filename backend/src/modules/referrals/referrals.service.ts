import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { ReferralCampaign } from './entities/referral-campaign.entity';
import { User } from '../user/entities/user.entity';
import { Transaction, TxType } from '../transactions/entities/transaction.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(Referral)
    private referralRepository: Repository<Referral>,
    @InjectRepository(ReferralCampaign)
    private campaignRepository: Repository<ReferralCampaign>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(userId: string, campaignId?: string): Promise<Referral> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has an active referral code
    const existing = await this.referralRepository.findOne({
      where: { referrerId: userId, campaignId: campaignId || null },
    });

    if (existing) {
      return existing;
    }

    // Validate campaign if provided
    let campaign: ReferralCampaign | null = null;
    if (campaignId) {
      campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
      if (!campaign || !campaign.isActive) {
        throw new BadRequestException('Invalid or inactive campaign');
      }
    }

    // Generate unique code
    const code = await this.generateUniqueCode();

    const referral = this.referralRepository.create({
      referrerId: userId,
      referralCode: code,
      campaignId: campaignId || null,
      status: ReferralStatus.PENDING,
    });

    return this.referralRepository.save(referral);
  }

  /**
   * Apply a referral code during user signup
   */
  async applyReferralCode(referralCode: string, refereeId: string): Promise<void> {
    const referral = await this.referralRepository.findOne({
      where: { referralCode },
      relations: ['referrer', 'campaign'],
    });

    if (!referral) {
      throw new NotFoundException('Invalid referral code');
    }

    if (referral.refereeId) {
      throw new ConflictException('Referral code already used');
    }

    if (referral.referrerId === refereeId) {
      throw new BadRequestException('Cannot use your own referral code');
    }

    // Check if campaign is still valid
    if (referral.campaign) {
      const now = new Date();
      if (referral.campaign.endDate && new Date(referral.campaign.endDate) < now) {
        referral.status = ReferralStatus.EXPIRED;
        await this.referralRepository.save(referral);
        throw new BadRequestException('Referral campaign has expired');
      }
    }

    // Fraud detection: Check if referee already referred by someone else
    const existingReferral = await this.referralRepository.findOne({
      where: { refereeId },
    });

    if (existingReferral) {
      throw new ConflictException('User already referred by another user');
    }

    referral.refereeId = refereeId;
    await this.referralRepository.save(referral);

    this.logger.log(`Referral code ${referralCode} applied for user ${refereeId}`);
  }

  /**
   * Check and complete referral when user makes first deposit
   */
  async checkAndCompleteReferral(userId: string, depositAmount: string): Promise<void> {
    const referral = await this.referralRepository.findOne({
      where: { refereeId: userId, status: ReferralStatus.PENDING },
      relations: ['referrer', 'campaign'],
    });

    if (!referral) {
      return; // No pending referral for this user
    }

    // Check minimum deposit requirement
    const campaign = referral.campaign;
    const minDeposit = campaign?.minDepositAmount || '0';
    
    if (parseFloat(depositAmount) < parseFloat(minDeposit)) {
      this.logger.log(
        `Deposit amount ${depositAmount} below minimum ${minDeposit} for referral ${referral.id}`,
      );
      return;
    }

    // Fraud detection checks
    const isFraudulent = await this.detectFraud(referral);
    if (isFraudulent) {
      referral.status = ReferralStatus.FRAUDULENT;
      await this.referralRepository.save(referral);
      this.logger.warn(`Fraudulent referral detected: ${referral.id}`);
      return;
    }

    // Mark as completed
    referral.status = ReferralStatus.COMPLETED;
    referral.completedAt = new Date();
    await this.referralRepository.save(referral);

    // Emit event for reward distribution
    this.eventEmitter.emit('referral.completed', {
      referralId: referral.id,
      referrerId: referral.referrerId,
      refereeId: referral.refereeId,
      campaignId: referral.campaignId,
    });

    this.logger.log(`Referral ${referral.id} completed`);
  }

  /**
   * Distribute rewards for completed referral
   */
  async distributeRewards(referralId: string): Promise<void> {
    const referral = await this.referralRepository.findOne({
      where: { id: referralId, status: ReferralStatus.COMPLETED },
      relations: ['referrer', 'referee', 'campaign'],
    });

    if (!referral) {
      throw new NotFoundException('Completed referral not found');
    }

    const campaign = referral.campaign;
    const defaultReward = '10'; // Default reward if no campaign

    // Check max rewards per user limit
    if (campaign?.maxRewardsPerUser) {
      const rewardedCount = await this.referralRepository.count({
        where: {
          referrerId: referral.referrerId,
          status: ReferralStatus.REWARDED,
          campaignId: campaign.id,
        },
      });

      if (rewardedCount >= campaign.maxRewardsPerUser) {
        this.logger.warn(
          `User ${referral.referrerId} reached max rewards limit for campaign ${campaign.id}`,
        );
        return;
      }
    }

    const referrerReward = campaign?.rewardAmount || defaultReward;
    const refereeReward = campaign?.refereeRewardAmount;

    // Update referral status
    referral.status = ReferralStatus.REWARDED;
    referral.rewardAmount = referrerReward;
    referral.rewardedAt = new Date();
    await this.referralRepository.save(referral);

    // Emit events for reward transactions
    this.eventEmitter.emit('referral.reward.distribute', {
      userId: referral.referrerId,
      amount: referrerReward,
      referralId: referral.id,
      type: 'referrer',
    });

    if (refereeReward && referral.refereeId) {
      this.eventEmitter.emit('referral.reward.distribute', {
        userId: referral.refereeId,
        amount: refereeReward,
        referralId: referral.id,
        type: 'referee',
      });
    }

    this.logger.log(`Rewards distributed for referral ${referralId}`);
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(userId: string) {
    const referrals = await this.referralRepository.find({
      where: { referrerId: userId },
    });

    const userReferral = referrals[0]; // Get user's referral code

    const stats = {
      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter((r) => r.status === ReferralStatus.PENDING).length,
      completedReferrals: referrals.filter((r) => r.status === ReferralStatus.COMPLETED).length,
      rewardedReferrals: referrals.filter((r) => r.status === ReferralStatus.REWARDED).length,
      totalRewardsEarned: referrals
        .filter((r) => r.status === ReferralStatus.REWARDED && r.rewardAmount)
        .reduce((sum, r) => sum + parseFloat(r.rewardAmount!), 0)
        .toFixed(7),
      referralCode: userReferral?.referralCode || null,
    };

    return stats;
  }

  /**
   * Get detailed referral list for a user
   */
  async getUserReferrals(userId: string) {
    return this.referralRepository.find({
      where: { referrerId: userId },
      relations: ['referee'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Fraud detection logic
   */
  private async detectFraud(referral: Referral): Promise<boolean> {
    // Check 1: Same IP address (would need IP tracking in metadata)
    // Check 2: Rapid signups from same referrer
    const recentReferrals = await this.referralRepository.count({
      where: {
        referrerId: referral.referrerId,
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Last 24 hours
      },
    });

    if (recentReferrals > 10) {
      this.logger.warn(`Suspicious activity: ${recentReferrals} referrals in 24h`);
      return true;
    }

    // Check 3: Referee has suspicious transaction patterns
    if (referral.refereeId) {
      const transactions = await this.transactionRepository.find({
        where: { userId: referral.refereeId },
      });

      // If only one deposit and immediate withdrawal, flag as suspicious
      const deposits = transactions.filter((t) => t.type === TxType.DEPOSIT);
      const withdrawals = transactions.filter((t) => t.type === TxType.WITHDRAW);

      if (deposits.length === 1 && withdrawals.length > 0) {
        const timeDiff =
          new Date(withdrawals[0].createdAt).getTime() -
          new Date(deposits[0].createdAt).getTime();
        if (timeDiff < 60 * 60 * 1000) {
          // Less than 1 hour
          this.logger.warn(`Suspicious withdrawal pattern for user ${referral.refereeId}`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate unique referral code
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists = true;

    while (exists) {
      code = randomBytes(6).toString('base64url').substring(0, 8).toUpperCase();
      const existing = await this.referralRepository.findOne({
        where: { referralCode: code },
      });
      exists = !!existing;
    }

    return code!;
  }

  /**
   * Admin: Get all referrals with filters
   */
  async getAllReferrals(status?: ReferralStatus, campaignId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (campaignId) where.campaignId = campaignId;

    return this.referralRepository.find({
      where,
      relations: ['referrer', 'referee', 'campaign'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Admin: Update referral status
   */
  async updateReferralStatus(
    referralId: string,
    status: ReferralStatus,
    rewardAmount?: number,
  ): Promise<Referral> {
    const referral = await this.referralRepository.findOne({
      where: { id: referralId },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    referral.status = status;
    if (rewardAmount !== undefined) {
      referral.rewardAmount = rewardAmount.toString();
    }

    if (status === ReferralStatus.REWARDED && !referral.rewardedAt) {
      referral.rewardedAt = new Date();
    }

    return this.referralRepository.save(referral);
  }
}
