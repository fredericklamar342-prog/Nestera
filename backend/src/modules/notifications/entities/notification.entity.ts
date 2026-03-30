import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  SWEEP_COMPLETED = 'SWEEP_COMPLETED',
  CLAIM_UPDATED = 'CLAIM_UPDATED',
  CLAIM_APPROVED = 'CLAIM_APPROVED',
  CLAIM_REJECTED = 'CLAIM_REJECTED',
  YIELD_EARNED = 'YIELD_EARNED',
  DEPOSIT_RECEIVED = 'DEPOSIT_RECEIVED',
  WAITLIST_AVAILABLE = 'WAITLIST_AVAILABLE',
  GOAL_MILESTONE = 'GOAL_MILESTONE',
  GOAL_COMPLETED = 'GOAL_COMPLETED',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  CHALLENGE_BADGE_EARNED = 'CHALLENGE_BADGE_EARNED',
  PRODUCT_ALERT_TRIGGERED = 'PRODUCT_ALERT_TRIGGERED',
  REBALANCING_RECOMMENDED = 'REBALANCING_RECOMMENDED',
  ADMIN_CAPACITY_ALERT = 'ADMIN_CAPACITY_ALERT',
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['userId', 'read'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
