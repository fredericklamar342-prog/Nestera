export const BALANCE_CHANGED_EVENT = 'balance.changed';

/**
 * Emitted via @nestjs/event-emitter whenever a balance change is detected
 * for a subscribed Stellar account.
 */
export class BalanceChangedEvent {
  /** Stellar G... public key of the account */
  accountId: string;
  /** Asset code: 'native' for XLM, otherwise the asset code string */
  assetCode: string;
  /** Balance before this update (string to avoid float precision loss) */
  previousBalance: string;
  /** Balance after this update */
  newBalance: string;
  /** UTC timestamp of the change */
  changedAt: Date;
}

/**
 * Per-account connection health counters tracked by BalanceSyncService.
 * Requirement 6.1
 */
export interface AccountMetrics {
  publicKey: string;
  streamUptimeSeconds: number;
  reconnectCount: number;
  fallbackActive: boolean;
  connectedAt: Date | null;
}

/**
 * Aggregated metrics summary returned by getMetricsSummary().
 * Requirement 6.1, 6.4
 */
export interface ConnectionMetricsSummary {
  accounts: AccountMetrics[];
  anyFallbackActive: boolean;
  totalReconnects: number;
}

/**
 * In-memory handle for a single subscribed account's stream state.
 * Never persisted — lives only in the BalanceSyncService Map.
 */
export interface StreamHandle {
  /** Close function returned by Stellar SDK stream() */
  close: () => void;
  /** Whether the stream is currently considered connected */
  connected: boolean;
  /** Reconnect back-off state */
  reconnect: {
    delayMs: number;
    attempt: number;
    timer: NodeJS.Timeout | null;
  };
  /** Polling fallback interval handle */
  pollTimer: NodeJS.Timeout | null;
  /** Metrics for this account */
  metrics: AccountMetrics;
}
