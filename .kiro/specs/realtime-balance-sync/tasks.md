# Implementation Plan: Realtime Balance Sync

## Overview

Implement `BalanceSyncService` inside the existing `BlockchainModule`, wiring a per-account Stellar Horizon SSE stream to a Redis cache and `@nestjs/event-emitter`. Integrate cache-aside reads into `SavingsService`, add connection health metrics to `ProtocolMetrics`, and expose a metrics summary through `BlockchainController`.

## Tasks

- [x] 1. Add fast-check dev dependency and extend configuration
  - [x] 1.1 Install fast-check as a dev dependency
    - Run `pnpm add -D fast-check` to add the property-based testing library
    - _Requirements: 8.1_
  - [x] 1.2 Extend `backend/src/config/configuration.ts` with `balanceSync` config block
    - Add `balanceSync` namespace with keys: `cacheTtlSeconds`, `pollIntervalMs`, `reconnectInitialDelayMs`, `reconnectMaxDelayMs`, `metricsPersistIntervalMs`
    - Use env vars with documented defaults (300, 5000, 1000, 60000, 60000)
    - _Requirements: 8.1, 8.2_

- [x] 2. Create core types and the `BalanceChangedEvent`
  - [x] 2.1 Create `backend/src/modules/blockchain/balance-sync.types.ts`
    - Define `BalanceChangedEvent` class with fields: `accountId`, `assetCode`, `previousBalance`, `newBalance`, `changedAt`
    - Define `AccountMetrics`, `ConnectionMetricsSummary` interfaces
    - Define `StreamHandle` interface (in-memory only)
    - Export `BALANCE_CHANGED_EVENT = 'balance.changed'` constant
    - _Requirements: 3.2, 6.1_
  - [ ]* 2.2 Write property test for `BalanceChangedEvent` field completeness (Property 3)
    - `// Feature: realtime-balance-sync, Property 3: BalanceChangedEvent contains required fields`
    - Generate random `accountId`, `assetCode`, `previousBalance`, `newBalance` strings; assert all fields are non-empty after construction
    - **Property 3: BalanceChangedEvent contains required fields**
    - **Validates: Requirements 3.2**

- [x] 3. Implement `BalanceSyncService` — core structure and configuration validation
  - [x] 3.1 Create `backend/src/modules/blockchain/balance-sync.service.ts`
    - Scaffold `@Injectable() BalanceSyncService implements OnModuleInit, OnModuleDestroy`
    - Inject `ConfigService`, `CACHE_MANAGER`, `EventEmitter2`, `RpcClientWrapper`, and the `ProtocolMetrics` repository
    - In `onModuleInit`, read all `balanceSync` config values; log warnings for absent keys and use defaults
    - Validate `pollIntervalMs`: if ≤ 0 or > 60 000, log error and substitute 5 000
    - Initialise the `Map<string, StreamHandle>` for account handles
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 3.2 Write property test for configuration defaults (Property 9)
    - `// Feature: realtime-balance-sync, Property 9: Configuration defaults applied on missing values`
    - Generate absent/undefined config values; assert service resolves to documented defaults without throwing
    - **Property 9: Configuration defaults applied on missing values**
    - **Validates: Requirements 8.2**
  - [ ]* 3.3 Write property test for poll interval validation (Property 10)
    - `// Feature: realtime-balance-sync, Property 10: Poll interval validation rejects out-of-range values`
    - Generate integers ≤ 0 or > 60 000; assert default 5 000 is substituted and error is logged
    - **Property 10: Poll interval validation rejects out-of-range values**
    - **Validates: Requirements 8.3**

- [x] 4. Implement cache write helpers and `BalanceCache` integration
  - [x] 4.1 Add private `writeBalanceToCache` method to `BalanceSyncService`
    - Key pattern: `balance:{publicKey}:{assetCode}`
    - Value: `JSON.stringify({ balance, updatedAt: new Date().toISOString() })`
    - Set TTL from `cacheTtlSeconds` config
    - On cache write failure: log at `warn` level and do not rethrow
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 4.2 Write property test for balance cache round-trip (Property 1)
    - `// Feature: realtime-balance-sync, Property 1: Balance cache round-trip`
    - Generate random public keys, asset codes, and balance strings; write via `writeBalanceToCache`; read back from cache mock; assert equality
    - **Property 1: Balance cache round-trip**
    - **Validates: Requirements 2.1, 2.5**

- [x] 5. Implement balance-change detection and event emission
  - [x] 5.1 Add private `processAccountUpdate` method to `BalanceSyncService`
    - For each asset in the incoming account record, read the current cached balance
    - If the new balance differs from cached, call `writeBalanceToCache` then emit `BalanceChangedEvent` via `EventEmitter2`
    - If balance is unchanged, skip emission
    - _Requirements: 3.1, 3.3, 3.4_
  - [ ]* 5.2 Write property test for only-changed-balances emit events (Property 2)
    - `// Feature: realtime-balance-sync, Property 2: Only changed balances emit events`
    - Generate sequences of balance updates (some identical, some different); assert event count equals number of actual changes
    - **Property 2: Only changed balances emit events**
    - **Validates: Requirements 3.1, 3.3**
  - [ ]* 5.3 Write property test for per-asset event emission (Property 4)
    - `// Feature: realtime-balance-sync, Property 4: Per-asset event emission`
    - Generate account updates with N changed assets; assert exactly N `BalanceChangedEvent` instances emitted
    - **Property 4: Per-asset event emission**
    - **Validates: Requirements 3.4**

- [x] 6. Implement stream subscription and reconnection logic
  - [x] 6.1 Implement `subscribe(publicKey: string)` on `BalanceSyncService`
    - Idempotent: no-op if already subscribed
    - Open stream via `RpcClientWrapper.getCurrentHorizonServer().accounts().accountId(publicKey).stream()`
    - On each message, call `processAccountUpdate`; record `connectedAt` and set `connected = true`
    - On stream error/close, trigger reconnect loop and activate polling fallback
    - Store `StreamHandle` in the map
    - _Requirements: 1.1, 1.2, 1.3, 6.2_
  - [x] 6.2 Implement exponential back-off reconnect loop (private `scheduleReconnect`)
    - Delay formula: `min(initialDelayMs * 2^attempt, maxDelayMs)`
    - On success: log recovery, reset delay to initial, deactivate polling fallback, increment reconnect counter
    - On failure: increment reconnect counter in `ConnectionMetrics`, schedule next attempt
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 6.3 Write property test for exponential back-off bounds (Property 5)
    - `// Feature: realtime-balance-sync, Property 5: Exponential back-off bounds`
    - Generate random attempt counts and config values; assert computed delay equals `min(init * 2^n, max)` and never exceeds `maxDelayMs`
    - **Property 5: Exponential back-off bounds**
    - **Validates: Requirements 4.1**

- [x] 7. Implement polling fallback
  - [x] 7.1 Add private `activatePollingFallback` and `deactivatePollingFallback` methods
    - `activatePollingFallback`: set `pollTimer` using `setInterval`; each tick calls `RpcClientWrapper.executeWithRetry()` for the account, then calls `processAccountUpdate`; set `fallbackActive = true` on the handle's metrics
    - `deactivatePollingFallback`: clear `pollTimer`; set `fallbackActive = false`
    - Update the global `anyFallbackActive` flag in `getMetricsSummary()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 7.2 Write property test for fallback round-trip (Property 6)
    - `// Feature: realtime-balance-sync, Property 6: Fallback activates on disconnect, deactivates on reconnect`
    - Simulate disconnect then reconnect; assert `fallbackActive` transitions `false → true → false`
    - **Property 6: Fallback round-trip**
    - **Validates: Requirements 4.5, 5.2, 5.4**

- [x] 8. Implement `unsubscribe`, `getMetricsSummary`, and `OnModuleDestroy`
  - [x] 8.1 Implement `unsubscribe(publicKey: string)` on `BalanceSyncService`
    - Idempotent: no-op if not subscribed
    - Close stream, clear reconnect timer, clear poll timer, remove handle from map
    - _Requirements: 1.2, 1.4_
  - [x] 8.2 Implement `getMetricsSummary(): ConnectionMetricsSummary`
    - Aggregate `AccountMetrics` from all handles; compute `anyFallbackActive` and `totalReconnects`
    - _Requirements: 6.1, 6.4_
  - [x] 8.3 Implement `onModuleDestroy`
    - Iterate all handles; close streams and cancel all timers
    - _Requirements: 1.4_
  - [x] 8.4 Write unit tests for `subscribe`, `unsubscribe`, and `onModuleDestroy`
    - Assert `subscribe` opens a stream and stores the handle
    - Assert `unsubscribe` closes the stream and removes the handle
    - Assert `onModuleDestroy` closes all open streams and cancels all timers
    - _Requirements: 1.2, 1.4_

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement metrics persistence to `ProtocolMetrics`
  - [x] 10.1 Extend `ProtocolMetrics` entity with `connectionMetrics` column
    - Add `@Column('jsonb', { nullable: true }) connectionMetrics: ConnectionMetricsSummary | null` to `backend/src/modules/admin-analytics/entities/protocol-metrics.entity.ts`
    - _Requirements: 6.5_
  - [x] 10.2 Add private `persistMetrics` method and schedule it in `onModuleInit`
    - Use `setInterval` with `metricsPersistIntervalMs`; call `getMetricsSummary()` and upsert into `ProtocolMetrics`
    - Cancel the interval in `onModuleDestroy`
    - _Requirements: 6.5_

- [x] 11. Integrate `BalanceSyncService` into `BlockchainModule`
  - [x] 11.1 Register and export `BalanceSyncService` in `BlockchainModule`
    - Add to `providers` and `exports` arrays in `backend/src/modules/blockchain/blockchain.module.ts`
    - Import `EventEmitterModule` if not already present; import `TypeOrmModule.forFeature([ProtocolMetrics])` if needed
    - _Requirements: 7.4_
  - [x] 11.2 Expose `getMetricsSummary()` via `BlockchainController`
    - Add a `GET /blockchain/balance-sync/metrics` endpoint that calls `balanceSyncService.getMetricsSummary()`
    - _Requirements: 6.4_

- [x] 12. Integrate cache-aside reads into `SavingsService`
  - [x] 12.1 Update `SavingsService.getWalletBalance()` with cache-aside logic
    - Check `balance:{publicKey}:{asset ?? 'native'}` in cache; return parsed balance on hit
    - On miss: fetch from Horizon (existing logic), write to cache, return balance
    - _Requirements: 7.1, 7.2_
  - [x] 12.2 Update `SavingsService.getUserSavingsBalance()` with cache-aside logic
    - For each asset, check cache before hitting Horizon
    - _Requirements: 7.3_
  - [ ]* 12.3 Write property test for cache-aside hit (Property 7)
    - `// Feature: realtime-balance-sync, Property 7: Cache-aside read returns cached value on hit`
    - Seed cache mock with a value; call `getWalletBalance()`; assert Horizon mock not called
    - **Property 7: Cache-aside read returns cached value on hit**
    - **Validates: Requirements 7.1, 7.3**
  - [ ]* 12.4 Write property test for cache-aside miss populates cache (Property 8)
    - `// Feature: realtime-balance-sync, Property 8: Cache-aside populates cache on miss`
    - Empty cache; call `getWalletBalance()`; assert cache contains an entry equal to the returned balance
    - **Property 8: Cache-aside miss populates cache**
    - **Validates: Requirements 7.2**
  - [x] 12.5 Write unit tests for `SavingsService` cache-aside behaviour
    - Assert cached value returned without calling Horizon
    - Assert Horizon called and cache populated on miss
    - _Requirements: 7.1, 7.2_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests require `fast-check` (installed in task 1.1) and use Jest as the runner
- Each property test must include the comment `// Feature: realtime-balance-sync, Property N: <text>`
- Checkpoints ensure incremental validation before moving to the next phase
