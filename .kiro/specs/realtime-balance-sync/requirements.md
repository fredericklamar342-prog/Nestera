# Requirements Document

## Introduction

This feature replaces the existing polling-based balance retrieval in the NestJS backend with a WebSocket-based streaming service that subscribes to Stellar Horizon account updates in real time. The service maintains a Redis cache of account balances, emits internal events on balance changes via `@nestjs/event-emitter`, and falls back to the existing polling pattern when the WebSocket connection is unavailable. Connection health is exposed through the existing metrics infrastructure.

## Glossary

- **BalanceSyncService**: The new NestJS injectable service responsible for managing the Horizon WebSocket stream, updating the Redis cache, and emitting balance-change events.
- **HorizonStream**: The server-sent event / streaming connection opened via the Stellar SDK's `Horizon.Server.accounts().stream()` API.
- **BalanceCache**: The Redis cache (accessed via `@nestjs/cache-manager`) that stores the latest known balance for each subscribed Stellar account.
- **BalanceChangedEvent**: The internal application event emitted through `@nestjs/event-emitter` when a balance update is detected.
- **PollingFallback**: The periodic HTTP-based balance fetch that activates when the HorizonStream is unavailable.
- **RpcClientWrapper**: The existing wrapper class that provides `getCurrentHorizonServer()` and `executeWithRetry()` for Horizon access.
- **BlockchainService**: Refers collectively to `StellarService` and `SavingsService` within the `BlockchainModule`.
- **ConnectionMetrics**: The set of counters and gauges (reconnect count, stream uptime, fallback-active flag) tracked in the `ProtocolMetrics` entity.
- **Subscriber**: A Stellar account public key registered for real-time balance tracking.

---

## Requirements

### Requirement 1: WebSocket Stream Connection to Horizon

**User Story:** As a backend engineer, I want the system to open a streaming connection to Stellar Horizon for each subscribed account, so that balance updates are received in real time without polling.

#### Acceptance Criteria

1. WHEN `BalanceSyncService` initialises, THE `BalanceSyncService` SHALL open a `HorizonStream` for each registered `Subscriber` using `RpcClientWrapper.getCurrentHorizonServer()`.
2. THE `BalanceSyncService` SHALL support subscribing and unsubscribing individual `Subscriber` accounts at runtime without restarting the service.
3. WHILE a `HorizonStream` is open, THE `BalanceSyncService` SHALL process each incoming account update within 500 ms of receipt.
4. THE `BalanceSyncService` SHALL close all open `HorizonStream` connections gracefully when the NestJS module is destroyed (`OnModuleDestroy`).

---

### Requirement 2: Real-Time Balance Cache Updates

**User Story:** As a backend engineer, I want every incoming Horizon account update to be written to Redis immediately, so that other services always read a fresh balance without hitting Horizon directly.

#### Acceptance Criteria

1. WHEN a `HorizonStream` delivers an account update, THE `BalanceSyncService` SHALL write the updated balance to the `BalanceCache` keyed by the account's public key.
2. THE `BalanceSyncService` SHALL store balances for all asset types present in the account record (native XLM and any non-native assets).
3. THE `BalanceSyncService` SHALL set a configurable TTL on each `BalanceCache` entry, defaulting to 300 seconds.
4. IF a `BalanceCache` write fails, THEN THE `BalanceSyncService` SHALL log the error and continue processing subsequent updates without interruption.
5. FOR ALL valid account updates, writing then reading the `BalanceCache` SHALL return a value equal to the written balance (round-trip property).

---

### Requirement 3: Balance Change Event Emission

**User Story:** As a backend engineer, I want the system to emit an internal event whenever a balance changes, so that other modules (e.g., notifications, analytics) can react without polling the cache.

#### Acceptance Criteria

1. WHEN a `HorizonStream` delivers an account update whose balance differs from the previously cached value, THE `BalanceSyncService` SHALL emit a `BalanceChangedEvent` via `@nestjs/event-emitter`.
2. THE `BalanceChangedEvent` SHALL include the account public key, the previous balance, the new balance, the asset code, and the UTC timestamp of the change.
3. WHEN a `HorizonStream` delivers an account update whose balance is identical to the cached value, THE `BalanceSyncService` SHALL NOT emit a `BalanceChangedEvent`.
4. THE `BalanceSyncService` SHALL emit `BalanceChangedEvent` for each asset whose balance changed independently.

---

### Requirement 4: Automatic Reconnection on Connection Loss

**User Story:** As a backend engineer, I want the streaming connection to reconnect automatically after a failure, so that balance data remains current without manual intervention.

#### Acceptance Criteria

1. IF a `HorizonStream` closes unexpectedly, THEN THE `BalanceSyncService` SHALL attempt to reconnect using exponential back-off starting at 1 second, doubling on each attempt, up to a maximum interval of 60 seconds.
2. THE `BalanceSyncService` SHALL attempt reconnection indefinitely until the stream is re-established or the module is destroyed.
3. WHEN a reconnection attempt succeeds, THE `BalanceSyncService` SHALL log the recovery and reset the back-off interval to its initial value.
4. WHEN a reconnection attempt fails, THE `BalanceSyncService` SHALL increment the `ConnectionMetrics` reconnect counter.
5. WHILE reconnection attempts are in progress, THE `BalanceSyncService` SHALL activate the `PollingFallback` for affected `Subscriber` accounts.

---

### Requirement 5: Polling Fallback

**User Story:** As a backend engineer, I want the system to fall back to HTTP polling when the WebSocket stream is unavailable, so that balance data does not become stale during outages.

#### Acceptance Criteria

1. WHILE the `HorizonStream` for a `Subscriber` is not connected, THE `BalanceSyncService` SHALL poll Horizon for that account's balance at a configurable interval, defaulting to 5 seconds, using `RpcClientWrapper.executeWithRetry()`.
2. WHEN the `HorizonStream` for a `Subscriber` is re-established, THE `BalanceSyncService` SHALL deactivate the `PollingFallback` for that account and resume streaming.
3. WHILE the `PollingFallback` is active, THE `BalanceSyncService` SHALL apply the same cache-write and event-emission logic as the streaming path.
4. THE `BalanceSyncService` SHALL set the `ConnectionMetrics` fallback-active flag to `true` while any `Subscriber` is in polling mode and `false` when all streams are active.

---

### Requirement 6: Connection Health Metrics

**User Story:** As an operator, I want WebSocket connection health to be tracked in the existing metrics infrastructure, so that I can monitor stream reliability and detect degraded states.

#### Acceptance Criteria

1. THE `BalanceSyncService` SHALL record the following `ConnectionMetrics` for each `Subscriber`: stream uptime in seconds, total reconnect count, and whether the `PollingFallback` is currently active.
2. WHEN a `HorizonStream` connects successfully, THE `BalanceSyncService` SHALL record the connection timestamp and begin incrementing stream uptime.
3. WHEN a `HorizonStream` disconnects, THE `BalanceSyncService` SHALL stop incrementing stream uptime for that `Subscriber`.
4. THE `BalanceSyncService` SHALL expose an aggregated metrics summary accessible via an injected method so that `BlockchainController` can include it in health-check responses.
5. THE `BalanceSyncService` SHALL persist `ConnectionMetrics` snapshots to the `ProtocolMetrics` entity at a configurable interval, defaulting to 60 seconds.

---

### Requirement 7: BlockchainService Integration

**User Story:** As a backend engineer, I want `StellarService` and `SavingsService` to read balances from the `BalanceCache` when available, so that they serve fresh data without issuing redundant Horizon requests.

#### Acceptance Criteria

1. WHEN `SavingsService.getWalletBalance()` is called for a `Subscriber` account, THE `SavingsService` SHALL return the balance from the `BalanceCache` if a non-expired entry exists.
2. IF no `BalanceCache` entry exists for the requested account, THEN THE `SavingsService` SHALL fetch the balance from Horizon via `RpcClientWrapper.executeWithRetry()` and populate the cache before returning.
3. WHEN `SavingsService.getUserSavingsBalance()` is called, THE `SavingsService` SHALL use cached balances for any assets already present in the `BalanceCache`.
4. THE `BlockchainModule` SHALL register `BalanceSyncService` as a provider and export it so that other modules can subscribe accounts and read metrics.

---

### Requirement 8: Configuration

**User Story:** As a backend engineer, I want all tunable parameters of the sync service to be driven by `ConfigService`, so that they can be adjusted per environment without code changes.

#### Acceptance Criteria

1. THE `BalanceSyncService` SHALL read the following values from `ConfigService`: Horizon URL (`stellar.horizonUrl`), fallback Horizon URLs (`stellar.horizonFallbackUrls`), cache TTL in seconds, polling fallback interval in milliseconds, reconnect initial delay in milliseconds, reconnect maximum delay in milliseconds, and metrics persistence interval in milliseconds.
2. IF a required configuration value is absent, THEN THE `BalanceSyncService` SHALL use the documented default value and log a warning at startup.
3. THE `BalanceSyncService` SHALL validate that the polling fallback interval is greater than 0 ms and less than or equal to 60 000 ms at startup, logging an error and using the default if the value is out of range.
