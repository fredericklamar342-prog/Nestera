# Design Document: Realtime Balance Sync

## Overview

This feature replaces direct Horizon HTTP calls in `SavingsService.getWalletBalance()` and `getUserSavingsBalance()` with a streaming-first, cache-backed architecture. A new `BalanceSyncService` opens a Stellar Horizon SSE stream per subscribed account, writes every incoming balance update to Redis, and emits `BalanceChangedEvent` via `@nestjs/event-emitter` when a balance actually changes. When a stream drops, exponential back-off reconnection kicks in and a per-account polling fallback keeps the cache fresh. Connection health counters are persisted to `ProtocolMetrics` on a configurable schedule and exposed through `BlockchainController`.

The design fits entirely inside the existing `BlockchainModule` (already `@Global()`), reuses `RpcClientWrapper`, `@nestjs/cache-manager` (Redis-backed), and `@nestjs/event-emitter` — no new infrastructure dependencies are required.

---

## Architecture

```mermaid
flowchart TD
    subgraph BlockchainModule [BlockchainModule (Global)]
        BSS[BalanceSyncService]
        SS[StellarService]
        SavS[SavingsService]
        RPC[RpcClientWrapper]
        BSS -->|getCurrentHorizonServer| RPC
        BSS -->|executeWithRetry| RPC
        SavS -->|cache-aside read| CACHE
        SavS -->|subscribe on miss| BSS
    end

    subgraph Infrastructure
        CACHE[(Redis / cache-manager)]
        DB[(PostgreSQL / ProtocolMetrics)]
        EE[EventEmitter2]
    end

    HORIZON[Stellar Horizon SSE]

    HORIZON -->|account stream| BSS
    BSS -->|write balance| CACHE
    BSS -->|BalanceChangedEvent| EE
    BSS -->|persist metrics snapshot| DB
    EE -->|@OnEvent| NotificationsService
    EE -->|@OnEvent| AnalyticsService
```

### Key Design Decisions

1. **One stream handle per account** — The Stellar SDK's `server.accounts().accountId(id).stream()` returns a `() => void` close function. `BalanceSyncService` stores these handles in a `Map<string, StreamHandle>` keyed by public key, enabling O(1) subscribe/unsubscribe at runtime.

2. **Reconnection loop per account** — Each account has its own independent reconnect state (delay, attempt count, timer). This prevents a single flapping account from blocking reconnection of healthy accounts.

3. **Polling fallback is per-account** — When a stream for account A is reconnecting, only account A falls back to polling. Accounts with healthy streams are unaffected.

4. **Cache-aside in SavingsService** — `getWalletBalance()` checks the cache first; on a miss it fetches from Horizon, populates the cache, and returns. This is a read-through pattern that requires no changes to callers.

5. **ProtocolMetrics extension** — Rather than a new entity, a `jsonb` column `connectionMetrics` is added to `ProtocolMetrics` to store the per-account snapshot. This avoids a new migration table while keeping metrics queryable.

---

## Components and Interfaces

### BalanceSyncService

```typescript
@Injectable()
export class BalanceSyncService implements OnModuleInit, OnModuleDestroy {
  /** Subscribe an account for real-time balance tracking. Idempotent. */
  subscribe(publicKey: string): void;

  /** Unsubscribe an account and close its stream. Idempotent. */
  unsubscribe(publicKey: string): void;

  /** Return aggregated metrics for all subscribed accounts. */
  getMetricsSummary(): ConnectionMetricsSummary;
}
```

### BalanceChangedEvent

```typescript
export class BalanceChangedEvent {
  /** Stellar G... public key of the account */
  accountId: string;
  /** Asset code: 'native' for XLM, otherwise the asset code string */
  assetCode: string;
  /** Balance before this update (in stroops as a string to avoid float loss) */
  previousBalance: string;
  /** Balance after this update */
  newBalance: string;
  /** UTC timestamp of the change */
  changedAt: Date;
}
```

Event name constant: `'balance.changed'`

### ConnectionMetricsSummary

```typescript
export interface AccountMetrics {
  publicKey: string;
  streamUptimeSeconds: number;
  reconnectCount: number;
  fallbackActive: boolean;
  connectedAt: Date | null;
}

export interface ConnectionMetricsSummary {
  accounts: AccountMetrics[];
  anyFallbackActive: boolean;
  totalReconnects: number;
}
```

### Cache Key Schema

| Key pattern | Value | TTL |
|---|---|---|
| `balance:{publicKey}:{assetCode}` | JSON string `{ balance: string, updatedAt: string }` | Configurable, default 300 s |

Example: `balance:GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN:native`

### SavingsService changes

`getWalletBalance(publicKey, asset)` gains a cache-aside read:

```
1. key = `balance:${publicKey}:${asset ?? 'native'}`
2. hit = await cacheManager.get(key)
3. if hit → return parsed balance
4. balance = await horizonServer.accounts().accountId(publicKey).call() [existing logic]
5. await cacheManager.set(key, JSON.stringify({ balance, updatedAt: now }), cacheTtl)
6. return balance
```

`getUserSavingsBalance(publicKey)` similarly checks the cache for each asset before hitting Horizon.

---

## Data Models

### StreamHandle (in-memory only)

```typescript
interface StreamHandle {
  /** Close function returned by Stellar SDK stream() */
  close: () => void;
  /** Whether the stream is currently considered connected */
  connected: boolean;
  /** Reconnect back-off state */
  reconnect: {
    delayMs: number;
    timer: NodeJS.Timeout | null;
  };
  /** Polling fallback interval handle */
  pollTimer: NodeJS.Timeout | null;
  /** Metrics for this account */
  metrics: AccountMetrics;
}
```

### ProtocolMetrics entity extension

A new nullable `jsonb` column is added to the existing `ProtocolMetrics` entity:

```typescript
@Column('jsonb', { nullable: true })
connectionMetrics: ConnectionMetricsSummary | null;
```

This column stores the snapshot written by `BalanceSyncService` on its persistence interval.

### Configuration keys added to `configuration.ts`

```typescript
balanceSync: {
  cacheTtlSeconds:        parseInt(process.env.BALANCE_CACHE_TTL_SECONDS   || '300',   10),
  pollIntervalMs:         parseInt(process.env.BALANCE_POLL_INTERVAL_MS    || '5000',  10),
  reconnectInitialDelayMs:parseInt(process.env.BALANCE_RECONNECT_INIT_MS   || '1000',  10),
  reconnectMaxDelayMs:    parseInt(process.env.BALANCE_RECONNECT_MAX_MS    || '60000', 10),
  metricsPersistIntervalMs:parseInt(process.env.BALANCE_METRICS_PERSIST_MS || '60000', 10),
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Balance cache round-trip

*For any* valid Stellar account update delivered by a HorizonStream, writing the balance to the BalanceCache and then immediately reading it back should return a value equal to the written balance.

**Validates: Requirements 2.1, 2.5**

---

### Property 2: Only changed balances emit events

*For any* sequence of account updates for a given account and asset, a `BalanceChangedEvent` should be emitted if and only if the new balance differs from the previously cached balance.

**Validates: Requirements 3.1, 3.3**

---

### Property 3: BalanceChangedEvent contains required fields

*For any* `BalanceChangedEvent` emitted by `BalanceSyncService`, the event object should contain a non-empty `accountId`, a non-empty `assetCode`, a `previousBalance`, a `newBalance`, and a `changedAt` timestamp.

**Validates: Requirements 3.2**

---

### Property 4: Per-asset event emission

*For any* account update that changes balances for N assets, exactly N `BalanceChangedEvent` instances should be emitted — one per changed asset.

**Validates: Requirements 3.4**

---

### Property 5: Exponential back-off bounds

*For any* sequence of consecutive reconnection failures for a given account, the delay before each attempt should be `min(initialDelay * 2^attempt, maxDelay)`, and should never exceed `maxDelay`.

**Validates: Requirements 4.1**

---

### Property 6: Fallback activates on disconnect, deactivates on reconnect

*For any* account, if its stream disconnects then the polling fallback should become active; when the stream reconnects the polling fallback should become inactive. This is a round-trip property: `disconnect → fallbackActive=true`, `reconnect → fallbackActive=false`.

**Validates: Requirements 4.5, 5.2, 5.4**

---

### Property 7: Cache-aside read returns cached value on hit

*For any* account and asset for which a non-expired cache entry exists, `SavingsService.getWalletBalance()` should return the cached balance without issuing a Horizon HTTP request.

**Validates: Requirements 7.1, 7.3**

---

### Property 8: Cache-aside populates cache on miss

*For any* account and asset for which no cache entry exists, after `SavingsService.getWalletBalance()` returns, the BalanceCache should contain an entry for that account and asset equal to the returned balance.

**Validates: Requirements 7.2**

---

### Property 9: Configuration defaults applied on missing values

*For any* configuration key in the `balanceSync` namespace that is absent from the environment, `BalanceSyncService` should use the documented default value and the service should start without throwing.

**Validates: Requirements 8.2**

---

### Property 10: Poll interval validation rejects out-of-range values

*For any* configured `pollIntervalMs` value that is ≤ 0 or > 60 000, `BalanceSyncService` should log an error at startup and substitute the default value of 5 000 ms.

**Validates: Requirements 8.3**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Cache write fails | Log error at `warn` level; continue processing subsequent updates (Req 2.4) |
| Stream `onerror` fires | Trigger reconnect loop; activate polling fallback for that account |
| All Horizon endpoints unreachable during polling fallback | `executeWithRetry` exhausts retries; log error; next poll tick retries |
| `subscribe()` called for already-subscribed account | No-op (idempotent) |
| `unsubscribe()` called for unknown account | No-op |
| Config value out of range (`pollIntervalMs`) | Log error; use default; do not throw |
| Config value absent | Log warning; use default; do not throw |
| Module destroyed while reconnect timer is pending | `OnModuleDestroy` cancels all timers and closes all streams |

---

## Testing Strategy

### Unit tests (Jest)

Focus on specific examples, integration points, and error conditions:

- `BalanceSyncService.subscribe()` opens a stream and stores the handle
- `BalanceSyncService.unsubscribe()` closes the stream and removes the handle
- Cache write failure is caught and does not propagate
- `BalanceChangedEvent` is not emitted when balance is unchanged
- `OnModuleDestroy` closes all open streams and cancels all timers
- `SavingsService.getWalletBalance()` returns cached value without calling Horizon
- `SavingsService.getWalletBalance()` calls Horizon and populates cache on miss
- Config validation logs error and uses default for out-of-range `pollIntervalMs`

### Property-based tests (fast-check)

The project uses Jest as the test runner. [fast-check](https://fast-check.io/) is the property-based testing library to add (`pnpm add -D fast-check`). Each property test runs a minimum of **100 iterations**.

Each test must be tagged with a comment in the format:
`// Feature: realtime-balance-sync, Property N: <property text>`

| Property | Test description |
|---|---|
| P1: Balance cache round-trip | Generate random public keys, asset codes, and balance strings; write to cache mock; read back; assert equality |
| P2: Only changed balances emit events | Generate sequences of balance updates (some identical, some different); assert event count equals number of actual changes |
| P3: BalanceChangedEvent fields | Generate random account updates; assert every emitted event has all required non-empty fields |
| P4: Per-asset event emission | Generate account updates with N changed assets; assert exactly N events emitted |
| P5: Exponential back-off bounds | Generate random attempt counts and config values; assert computed delay equals `min(init * 2^n, max)` and never exceeds max |
| P6: Fallback round-trip | Simulate disconnect then reconnect; assert fallback transitions correctly |
| P7: Cache-aside hit | Seed cache with a value; call `getWalletBalance()`; assert Horizon mock not called |
| P8: Cache-aside miss populates | Empty cache; call `getWalletBalance()`; assert cache contains the returned value |
| P9: Config defaults | Generate absent/undefined config values; assert service uses documented defaults |
| P10: Poll interval validation | Generate out-of-range integers; assert default substituted and error logged |
