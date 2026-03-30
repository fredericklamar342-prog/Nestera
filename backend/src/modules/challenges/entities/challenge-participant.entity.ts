import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('challenge_participants')
@Index(['challengeId', 'userId'], { unique: true })
@Index(['challengeId', 'progressAmount'])
export class ChallengeParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  challengeId!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  progressAmount!: number;

  @Column({ type: 'boolean', default: false })
  completed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
