import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AlertType {
  APY_THRESHOLD = 'APY_THRESHOLD',
  NEW_PRODUCT = 'NEW_PRODUCT',
}

@Entity('product_alerts')
@Index(['userId', 'isActive'])
export class ProductAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'enum', enum: AlertType })
  type!: AlertType;

  @Column({ type: 'jsonb' })
  conditions!: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  snoozedUntil!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
