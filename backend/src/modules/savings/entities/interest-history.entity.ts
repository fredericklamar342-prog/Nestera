import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserSubscription } from './user-subscription.entity';

@Entity('interest_history')
@Index(['userId', 'calculationDate'])
export class InterestHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  subscriptionId: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  productId: string;

  @Column('decimal', { precision: 20, scale: 7 })
  principalAmount: string;

  @Column('decimal', { precision: 5, scale: 2 })
  interestRate: string;

  @Column('decimal', { precision: 20, scale: 7 })
  interestEarned: string;

  @Column({ type: 'date' })
  calculationDate: Date;

  @Column('int')
  periodDays: number;

  /** Groups all records from a single scheduler run */
  @Column('uuid')
  runId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserSubscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: UserSubscription;
}
