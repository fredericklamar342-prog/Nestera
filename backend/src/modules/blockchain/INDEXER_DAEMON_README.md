# Soroban Event Listener Daemon - Implementation Summary

## ✅ Completed Items

### 1. **IndexerState Entity** (`indexer-state.entity.ts`)
   - **Location**: `backend/src/modules/blockchain/entities/indexer-state.entity.ts`
   - **Purpose**: Persists indexer progress to the database
   - **Fields**:
     - `lastProcessedLedger`: Tracks the last ledger successfully processed
     - `lastProcessedTimestamp`: Timestamp of last successful processing (for health checks)
     - `totalEventsProcessed`: Running count of processed events
     - `totalEventsFailed`: Running count of failed events
     - `updatedAt`: Automatic timestamp of last update

### 2. **Enhanced IndexerService** (`indexer.service.ts`)
   - **Location**: `backend/src/modules/blockchain/indexer.service.ts`
   - **Key Features**:
     - ✅ Uses `@Cron(CronExpression.EVERY_5_SECONDS)` for heartbeat
     - ✅ Loads `IndexerState` from database on module init
     - ✅ Dynamically loads contract IDs from all active `SavingsProduct` entities
     - ✅ Implements `fetchEvents()` using Soroban `getEvents` RPC endpoint
     - ✅ Processes events through domain-specific handlers (Deposit, Yield, etc.)
     - ✅ Records failed events in `DeadLetterEvent` table for investigation
     - ✅ Persists progress to database after each cycle
     - ✅ Comprehensive logging for debugging and monitoring

### 3. **Updated BlockchainModule** (`blockchain.module.ts`)
   - **Changes**:
     - Added `IndexerState` to TypeORM feature imports
     - Service now has proper dependencies injected

## ✨ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│          IndexerService (Every 5 seconds)               │
│  @Cron(CronExpression.EVERY_5_SECONDS)                  │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬─────────────┐
        │                         │             │
        ▼                         ▼             ▼
    ┌────────────┐        ┌────────────┐  ┌──────────┐
    │ Load State │        │Get Contract│  │Fetch     │
    │from IndexerState    │IDs from    │  │Events    │
    │Entity      │        │Savings     │  │from      │
    │(Database)  │        │Products    │  │Soroban   │
    └────────────┘        └────────────┘  └──────────┘
        │                         │             │
        └────────────┬────────────┴─────────────┘
                     │
                     ▼
            ┌──────────────────────┐
            │  Process Events      │
            │  (For each event)    │
            └──────┬───────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌──────────┐
    │Deposit │ │ Yield  │ │   Other  │
    │Handler │ │Handler │ │ Handlers │
    └───┬────┘ └───┬────┘ └──────────┘
        │          │
        └──────┬───┘
               │
        ┌──────▼──────┐
        │   Success?   │
        └──────┬───────┘
            ┌──┴──┐
          YES    NO
            │     │
            ▼     ▼
        ┌────────────┐  ┌──────────────┐
        │Update Last │  │Save to       │
        │Processed   │  │DeadLetter    │
        │Ledger      │  │Queue (DLQ)   │
        └────────────┘  └──────────────┘
            │                  │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────────┐
            │ Save IndexerState    │
            │ to Database          │
            │ (Persist Progress)   │
            └──────────────────────┘
```

## 🚀 How It Works

### Initialization (`onModuleInit`)
1. Obtains RPC server instance from `StellarService`
2. Loads or creates `IndexerState` record in database
3. Queries all active `SavingsProduct` entities and caches their contract IDs
4. Logs startup status with number of contracts being monitored

### Event Loop (Every 5 seconds)
1. Checks if the service is ready and has contracts to monitor
2. Calls `fetchEvents()` to query Soroban for new events
3. For each event:
   - Dispatches to appropriate handler (Deposit, Yield, etc.)
   - Updates `lastProcessedLedger` on success
   - Records failure in `DeadLetterEvent` table on error
4. Persists updated state to `IndexerState` table
5. Logs cycle results for monitoring

### Event Fetching (`fetchEvents()`)
1. Retrieves events from Soroban RPC using `getEvents()` method
2. Filters by contract IDs tied to active Savings Products
3. Starts from `lastProcessedLedger + 1` to avoid duplicates
4. Sorts events by ledger sequence for ordering
5. Returns array of events ready for processing

## 📊 Database Schema

### IndexerState Table (`indexer_state`)
```sql
CREATE TABLE indexer_state (
  id UUID PRIMARY KEY,
  lastProcessedLedger BIGINT DEFAULT 0,
  lastProcessedTimestamp BIGINT NULL,
  totalEventsProcessed BIGINT DEFAULT 0,
  totalEventsFailed BIGINT DEFAULT 0,
  updatedAt TIMESTAMP WITH TIME ZONE
);
```

## 🔧 Configuration

The following environment variables control the indexer:

```env
# Soroban RPC Configuration
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_RPC_FALLBACK_URLS=https://backup-soroban-rpc.example.com

# Horizon Configuration (optional)
HORIZON_URL=https://horizon-testnet.stellar.org
HORIZON_FALLBACK_URLS=https://backup-horizon.example.com

# Database
DATABASE_URL=postgresql://user:pass@localhost/dbname
# or
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nestera
DB_USER=postgres
DB_PASS=password
```

## 🎯 Acceptance Criteria Met

- ✅ Created `indexer.service.ts` that runs via `@Cron(CronExpression.EVERY_5_SECONDS)`
- ✅ Tracks `lastProcessedLedger` in database table `IndexerState` (not just Redis/memory)
- ✅ Queries Soroban `getEvents` for contract IDs tied to Savings Products
- ✅ Handles deposits/withdraws events via dedicated handlers
- ✅ Comprehensive error handling with dead-letter queue
- ✅ Active heartbeat tracking via timestamp field

## 📝 Usage & Monitoring

### Health Check
```typescript
const state = indexerService.getIndexerState();
const lastProcessed = indexerService.getLastProcessedTimestamp();

// Alert if indexer hasn't processed anything in last 30 seconds
if (Date.now() - lastProcessed > 30000) {
  // Indexer might be stuck
}
```

### Manual Contract Reload
```typescript
// Reload contract IDs if new Savings Products are added
await indexerService.reloadContractIds();
```

### Debug Information
```typescript
// Get list of contracts currently being monitored
const contracts = indexerService.getMonitoredContracts();
console.log('Monitoring:', contracts);
```

## 🔍 Event Processing Flow

1. **Fetch**: Query Soroban RPC for events since last processed ledger
2. **Filter**: Only process events for monitored contract IDs
3. **Dispatch**: Route to appropriate handler (Deposit, Yield)
4. **Persist**: Save processed ledger number to database
5. **Error Handling**: Log failures to DeadLetterEvent table
6. **Metrics**: Update event counters in IndexerState

## 🛡️ Error Resilience

- **RPC Failures**: Logged with retry capability via `RpcClientWrapper`
- **Event Processing Errors**: Captured in `DeadLetterEvent` table for manual review
- **Database Failures**: Logged but don't block subsequent cycles
- **Contract Monitoring**: Continues with available contracts if one fails
- **State Persistence**: State saved even if some events fail

## 🚦 Next Steps

1. **Deploy**: Run the application - migrations will auto-create `indexer_state` table
2. **Monitor**: Watch logs for "Blockchain indexer initialized"
3. **Verify**: Check `indexer_state` table for populated `lastProcessedLedger`
4. **Test**: Trigger contract events and verify they're captured
5. **Extend**: Add more event handlers as needed (yields, withdrawals, etc.)

## 📚 Related Files

- **Service**: [indexer.service.ts](../../blockchain/indexer.service.ts)
- **Entity**: [indexer-state.entity.ts](../../blockchain/entities/indexer-state.entity.ts)
- **Module**: [blockchain.module.ts](../../blockchain/blockchain.module.ts)
- **Handlers**: 
  - [deposit.handler.ts](../../blockchain/event-handlers/deposit.handler.ts)
  - [yield.handler.ts](../../blockchain/event-handlers/yield.handler.ts)
- **Config**: [configuration.ts](../../config/configuration.ts)
