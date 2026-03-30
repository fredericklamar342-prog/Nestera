import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('challenge_achievements')
@Index(['userId', 'challengeId'])
export class ChallengeAchievement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  challengeId!: string;

  @Column({ type: 'varchar' })
  badgeName!: string;

  @Column({ type: 'varchar', unique: true })
  shareCode!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
