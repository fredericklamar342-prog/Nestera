import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../user/entities/user.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';
import { ChallengeAchievement } from './entities/challenge-achievement.entity';
import { ChallengeParticipant } from './entities/challenge-participant.entity';
import { SavingsChallenge } from './entities/savings-challenge.entity';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SavingsChallenge,
      ChallengeParticipant,
      ChallengeAchievement,
      UserSubscription,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
