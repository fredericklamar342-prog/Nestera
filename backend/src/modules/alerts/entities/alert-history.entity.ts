import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('alert_history')
@Index(['alertId', 'createdAt'])
export class AlertHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  alertId!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'varchar' })
  channel!: 'IN_APP' | 'EMAIL' | 'PUSH';

  @Column({ type: 'varchar' })
  message!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
