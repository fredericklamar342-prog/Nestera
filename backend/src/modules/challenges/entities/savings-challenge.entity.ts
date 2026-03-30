import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('savings_challenges')
@Index(['startsAt', 'endsAt'])
export class SavingsChallenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  targetAmount!: number;

  @Column({ type: 'timestamp' })
  startsAt!: Date;

  @Column({ type: 'timestamp' })
  endsAt!: Date;

  @Column({ type: 'varchar', default: 'Challenger' })
  badgeName!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
