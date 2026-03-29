import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

/**
 * IndexerState tracks the progress of the Soroban event indexer.
 * This entity persists the last processed ledger sequence number to ensure
 * the indexer can resume from where it left off after restarts.
 */
@Entity('indexer_state')
export class IndexerState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The last ledger sequence number that was successfully processed.
   * Used to fetch only new events on the next indexer cycle.
   */
  @Column({ type: 'bigint', default: 0 })
  lastProcessedLedger: number;

  /**
   * Timestamp of when the last ledger was processed.
   * Used for health checks to verify the indexer is actively processing events.
   */
  @Column({ type: 'bigint', nullable: true })
  lastProcessedTimestamp: number | null;

  /**
   * Running count of total events processed since service initialization
   * Useful for monitoring and metrics
   */
  @Column({ type: 'bigint', default: 0 })
  totalEventsProcessed: number;

  /**
   * Running count of events that failed processing
   * Useful for monitoring and debugging indexer issues
   */
  @Column({ type: 'bigint', default: 0 })
  totalEventsFailed: number;

  /**
   * Track the last time the indexer ran to detect stalls
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
