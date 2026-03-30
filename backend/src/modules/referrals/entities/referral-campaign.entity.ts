import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('referral_campaigns')
export class ReferralCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 7 })
  rewardAmount: string;

  @Column({ type: 'decimal', precision: 18, scale: 7, nullable: true })
  refereeRewardAmount: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 7, default: 0 })
  minDepositAmount: string;

  @Column({ type: 'integer', nullable: true })
  maxRewardsPerUser: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
