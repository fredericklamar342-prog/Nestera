import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
  UserSubscription,
  SubscriptionStatus,
} from '../savings/entities/user-subscription.entity';
import { User } from '../user/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { ChallengeAchievement } from './entities/challenge-achievement.entity';
import { ChallengeParticipant } from './entities/challenge-participant.entity';
import { SavingsChallenge } from './entities/savings-challenge.entity';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    @InjectRepository(SavingsChallenge)
    private readonly challengeRepository: Repository<SavingsChallenge>,
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(ChallengeAchievement)
    private readonly achievementRepository: Repository<ChallengeAchievement>,
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepository: Repository<UserSubscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createChallenge(dto: CreateChallengeDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException('Challenge start must be before end date');
    }

    const challenge = this.challengeRepository.create({
      title: dto.title,
      description: dto.description,
      targetAmount: dto.targetAmount,
      startsAt,
      endsAt,
      badgeName: dto.badgeName || 'Challenger',
      isActive: true,
    });

    return this.challengeRepository.save(challenge);
  }

  async joinChallenge(userId: string, challengeId: string) {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId, isActive: true },
    });
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const existing = await this.participantRepository.findOne({
      where: { challengeId, userId },
    });

    if (existing) {
      return existing;
    }

    const progressAmount = await this.calculateProgress(userId, challenge);

    const participant = this.participantRepository.create({
      challengeId,
      userId,
      progressAmount,
      completed: progressAmount >= Number(challenge.targetAmount),
      completedAt:
        progressAmount >= Number(challenge.targetAmount) ? new Date() : null,
    });

    const saved = await this.participantRepository.save(participant);
    await this.handleCompletionIfNeeded(saved, challenge);

    return saved;
  }

  async getChallengeLeaderboard(challengeId: string) {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    await this.refreshChallengeProgress(challengeId);

    const participants = await this.participantRepository.find({
      where: { challengeId },
      order: { progressAmount: 'DESC', updatedAt: 'ASC' },
      take: 100,
    });

    return {
      challenge,
      leaderboard: participants.map((participant, idx) => ({
        rank: idx + 1,
        userId: participant.userId,
        progressAmount: Number(participant.progressAmount),
        completed: participant.completed,
      })),
    };
  }

  async getUserAchievements(userId: string) {
    return this.achievementRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async socialSharePayload(achievementId: string) {
    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });

    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    const challenge = await this.challengeRepository.findOne({
      where: { id: achievement.challengeId },
    });

    return {
      title: `I just earned the ${achievement.badgeName} badge on Nestera!`,
      message: `Completed ${challenge?.title || 'a savings challenge'} and unlocked ${achievement.badgeName}.`,
      shareUrl: `https://nestera.app/challenges/share/${achievement.shareCode}`,
      hashtags: ['Nestera', 'SavingsChallenge', 'SmartMoney'],
    };
  }

  async refreshChallengeProgress(challengeId: string) {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const participants = await this.participantRepository.find({
      where: { challengeId },
    });

    for (const participant of participants) {
      const progressAmount = await this.calculateProgress(
        participant.userId,
        challenge,
      );

      participant.progressAmount = progressAmount;
      participant.completed = progressAmount >= Number(challenge.targetAmount);
      if (participant.completed && !participant.completedAt) {
        participant.completedAt = new Date();
      }

      await this.participantRepository.save(participant);
      await this.handleCompletionIfNeeded(participant, challenge);
    }
  }

  async listChallenges() {
    return this.challengeRepository.find({
      where: { isActive: true },
      order: { startsAt: 'ASC' },
    });
  }

  private async calculateProgress(userId: string, challenge: SavingsChallenge) {
    const subscriptions = await this.subscriptionRepository.find({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const total = subscriptions.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0,
    );

    return Number(total.toFixed(2));
  }

  private async handleCompletionIfNeeded(
    participant: ChallengeParticipant,
    challenge: SavingsChallenge,
  ) {
    if (!participant.completed) {
      return;
    }

    const existing = await this.achievementRepository.findOne({
      where: {
        userId: participant.userId,
        challengeId: participant.challengeId,
      },
    });

    if (existing) {
      return;
    }

    const user = await this.userRepository.findOne({
      where: { id: participant.userId },
    });

    const achievement = this.achievementRepository.create({
      userId: participant.userId,
      challengeId: participant.challengeId,
      badgeName: challenge.badgeName,
      shareCode: randomUUID(),
    });

    const saved = await this.achievementRepository.save(achievement);

    await this.notificationsService.createNotification({
      userId: participant.userId,
      type: NotificationType.CHALLENGE_BADGE_EARNED,
      title: 'Badge earned',
      message: `You completed ${challenge.title} and earned the ${challenge.badgeName} badge.`,
      metadata: {
        challengeId: challenge.id,
        achievementId: saved.id,
      },
    });

    this.eventEmitter.emit('challenge.completed', {
      userId: participant.userId,
      challengeId: challenge.id,
      badgeName: challenge.badgeName,
      userEmail: user?.email || null,
    });

    this.logger.log(
      `User ${participant.userId} completed challenge ${challenge.id}`,
    );
  }
}
