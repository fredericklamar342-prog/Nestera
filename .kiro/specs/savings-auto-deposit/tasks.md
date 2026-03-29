# Implementation Plan: Savings Auto-Deposit (Recurring Deposits)

## Overview

Implement the `AutoDepositModule` as a standalone NestJS module at `backend/src/modules/auto-deposit/`. Tasks follow the dependency order: enums → entities → DTOs → service → scheduler → controller → module wiring → mail integration → app wiring.

## Tasks

- [ ] 1. Define enums and create database entities
  - [ ] 1.1 Create enums file with `DepositSchedule`, `DepositStatus`, and `ExecutionStatus`
    - Create `backend/src/modules/auto-deposit/enums/auto-deposit.enums.ts`
    - Export `DepositSchedule` (daily/weekly/monthly), `DepositStatus` (active/paused/cancelled), `ExecutionStatus` (success/failed/permanently_failed)
    - _Requirements: 1.2, 2.4, 3.2_

  - [ ] 1.2 Create `RecurringDeposit` TypeORM entity
    - Create `backend/src/modules/auto-deposit/entities/recurring-deposit.entity.ts`
    - Columns: `id` (uuid PK), `userId`, `productId`, `amount` (decimal 14,2), `schedule` (enum), `status` (enum, default active), `nextRunAt` (timestamptz), `notificationSentForCurrentRun` (boolean, default false), `createdAt`, `updatedAt`
    - Add composite indexes: `(userId, productId, status)` and `(status, nextRunAt)`
    - _Requirements: 1.2, 4.3_

  - [ ] 1.3 Create `DepositExecutionRecord` TypeORM entity
    - Create `backend/src/modules/auto-deposit/entities/deposit-execution-record.entity.ts`
    - Columns: `id` (uuid PK), `recurringDepositId`, `status` (enum), `attemptNumber` (int, default 1), `errorMessage` (text, nullable), `executedAt` (timestamptz), `createdAt`
    - Add index: `(recurringDepositId, executedAt DESC)`
    - _Requirements: 2.4, 3.4_

  - [ ] 1.4 Create TypeORM migration for both tables
    - Generate migration creating `recurring_deposits` and `deposit_execution_records` tables with all columns and indexes
    - _Requirements: 1.2, 2.4_

- [ ] 2. Create DTOs
  - [ ] 2.1 Create `CreateRecurringDepositDto`
    - Create `backend/src/modules/auto-deposit/dto/create-recurring-deposit.dto.ts`
    - Fields: `productId` (`@IsUUID()`), `amount` (`@IsNumber()`, `@Min(0)`), `schedule` (`@IsEnum(DepositSchedule)`)
    - Add Swagger `@ApiProperty` decorators
    - _Requirements: 1.1, 1.7_

  - [ ] 2.2 Create `RecurringDepositResponseDto` and `AnalyticsResponseDto`
    - Create `backend/src/modules/auto-deposit/dto/recurring-deposit-response.dto.ts` mapping all entity fields
    - Create `backend/src/modules/auto-deposit/dto/analytics-response.dto.ts` with fields: `totalActive`, `totalPaused`, `totalCancelled`, `successfulExecutionsLast30Days`, `permanentlyFailedLast30Days`
    - Add Swagger `@ApiProperty` decorators on both
    - _Requirements: 8.1, 8.3_

- [ ] 3. Implement `AutoDepositService`
  - [ ] 3.1 Implement `create` method
    - Validate `productId` exists and is active → throw `NotFoundException` (404) if not
    - Validate `amount >= product.minAmount` → throw `UnprocessableEntityException` (422) if not
    - Check for existing active deposit for same `(userId, productId)` → throw `ConflictException` (409) if found
    - Compute initial `nextRunAt` using schedule helper (daily +1d, weekly +7d, monthly +1 calendar month via `date-fns addMonths`)
    - Insert and return `RecurringDeposit`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 3.2 Write property test for `create` — Property 1: Created deposit contains all required fields
    - **Property 1: Created deposit contains all required fields**
    - **Validates: Requirements 1.1, 1.2**
    - Generate valid (schedule, amount ≥ minAmount, productId) tuples with fast-check; assert returned entity has all required fields, `status = active`, `nextRunAt > now`
    - Tag: `// Feature: savings-auto-deposit, Property 1: Created deposit contains all required fields`

  - [ ]* 3.3 Write property test for `create` — Property 2: Amount below minAmount rejected with 422
    - **Property 2: Amount below minAmount is rejected with 422**
    - **Validates: Requirements 1.3**
    - Generate amounts in `[0, product.minAmount)` with fast-check; assert `UnprocessableEntityException` is thrown
    - Tag: `// Feature: savings-auto-deposit, Property 2: Amount below minAmount rejected with 422`

  - [ ] 3.4 Implement `findAll`, `findOne`, and ownership guard helper
    - `findAll(userId)`: return all deposits where `userId` matches
    - `findOne(id, userId)`: return deposit by id; throw `NotFoundException` (404) if not found; throw `ForbiddenException` (403) if `userId` doesn't match
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 3.5 Write property test for `findAll` — Property 12: List endpoint returns only authenticated user's deposits
    - **Property 12: List isolation**
    - **Validates: Requirements 6.1**
    - Generate deposits for multiple users; assert `findAll(userA)` returns no records owned by userB
    - Tag: `// Feature: savings-auto-deposit, Property 12: List endpoint returns only authenticated user's deposits`

  - [ ]* 3.6 Write property test for ownership enforcement — Property 10: Ownership enforced on all mutating endpoints
    - **Property 10: Ownership enforcement**
    - **Validates: Requirements 5.3, 6.3, 7.2**
    - Generate two distinct user IDs and a deposit owned by user A; assert `findOne`, `pause`, `resume`, `cancel` all throw `ForbiddenException` for user B
    - Tag: `// Feature: savings-auto-deposit, Property 10: Ownership is enforced on all mutating and read endpoints`

  - [ ] 3.7 Implement `pause`, `resume`, and `cancel` methods
    - `pause(id, userId)`: set `status = paused`; reuse ownership guard
    - `resume(id, userId)`: set `status = active`, recompute `nextRunAt` from current UTC time, reset `notificationSentForCurrentRun = false`
    - `cancel(id, userId)`: set `status = cancelled`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2_

  - [ ]* 3.8 Write property test for pause/resume — Property 11: Pause/resume is a round-trip state transition
    - **Property 11: Pause/resume round trip**
    - **Validates: Requirements 5.1, 5.2**
    - Generate active deposits; pause then resume; assert `status = active` and `nextRunAt > resumeTime`
    - Tag: `// Feature: savings-auto-deposit, Property 11: Pause/resume is a round-trip state transition`

  - [ ] 3.9 Implement `getAnalytics` method (admin)
    - Query aggregate counts: total active, paused, cancelled `RecurringDeposit` records
    - Query `DepositExecutionRecord` for successful and permanently_failed executions in the last 30 days
    - Return `AnalyticsResponseDto`
    - _Requirements: 8.1_

- [ ] 4. Checkpoint — Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement `DepositSchedulerService`
  - [ ] 5.1 Implement `nextRunAt` computation helper
    - Create `computeNextRunAt(schedule: DepositSchedule, from: Date): Date`
    - daily → `addDays(from, 1)`, weekly → `addDays(from, 7)`, monthly → `addMonths(from, 1)` (date-fns)
    - _Requirements: 2.3_

  - [ ]* 5.2 Write property test for `nextRunAt` helper — Property 4: nextRunAt advances correctly on success
    - **Property 4: nextRunAt advances correctly on success**
    - **Validates: Requirements 2.3**
    - Generate schedule types and arbitrary base timestamps with fast-check; assert `computeNextRunAt` returns exactly `base + interval(schedule)`
    - Tag: `// Feature: savings-auto-deposit, Property 4: nextRunAt advances correctly on success`

  - [ ] 5.3 Implement retry backoff helper
    - Create `computeRetryDelay(attemptNumber: number): number` returning `5 * 2^(n-1)` minutes in milliseconds
    - _Requirements: 3.1_

  - [ ]* 5.4 Write property test for retry backoff — Property 7: Retry backoff delay is exponential
    - **Property 7: Exponential backoff**
    - **Validates: Requirements 3.1**
    - Generate attempt numbers 1–3 with fast-check; assert `computeRetryDelay(n) === 5 * Math.pow(2, n - 1) * 60_000`
    - Tag: `// Feature: savings-auto-deposit, Property 7: Retry backoff delay is exponential`

  - [ ] 5.5 Implement due-deposit query and scheduler guard
    - Query `RecurringDeposit` where `status = active` AND `nextRunAt <= now`
    - Acquire Redis distributed lock (`SET NX EX 55s`) before processing; skip tick if lock not acquired
    - Release lock in `finally` block
    - _Requirements: 2.1, 2.5_

  - [ ]* 5.6 Write property test for scheduler filter — Property 3: Scheduler only processes active deposits
    - **Property 3: Scheduler filters non-active deposits**
    - **Validates: Requirements 5.5, 7.3**
    - Generate deposits with `status = paused` or `cancelled` and arbitrary `nextRunAt`; assert due-deposit query returns empty set
    - Tag: `// Feature: savings-auto-deposit, Property 3: Scheduler only processes active deposits`

  - [ ] 5.7 Implement pre-deposit notification logic
    - For each due deposit where `nextRunAt <= now + 24h` AND `notificationSentForCurrentRun = false`:
      - Call `mailService.sendPreDepositEmail`; catch and log any error without rethrowing
      - Set `notificationSentForCurrentRun = true` on success
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.8 Write property test for notification deduplication — Property 8: Pre-deposit notification sent at most once per occurrence
    - **Property 8: Notification at-most-once**
    - **Validates: Requirements 4.1, 4.3**
    - Generate deposits with `nextRunAt` within 24h; simulate two scheduler ticks; assert `sendPreDepositEmail` called exactly once
    - Tag: `// Feature: savings-auto-deposit, Property 8: Pre-deposit notification is sent at most once per occurrence`

  - [ ]* 5.9 Write property test for email context — Property 9: Pre-deposit email contains required fields
    - **Property 9: Email context fields**
    - **Validates: Requirements 4.2**
    - Generate deposits with random amounts and product names; assert email context passed to `MailService` includes `amount`, `productName`, and `nextRunAt` in UTC
    - Tag: `// Feature: savings-auto-deposit, Property 9: Pre-deposit email contains required fields`

  - [ ] 5.10 Implement deposit execution with concurrency and retry
    - Process due deposits concurrently using `Promise.allSettled` with a configurable concurrency limit (default 10)
    - On success: update `nextRunAt` via `computeNextRunAt`, reset `notificationSentForCurrentRun = false`, insert `ExecutionRecord(success)`
    - On failure: insert `ExecutionRecord(failed, attemptN, errorMessage)`; if `attemptNumber < 3` schedule retry via `computeRetryDelay`; if `attemptNumber === 3` insert `ExecutionRecord(permanently_failed)` and emit `recurring-deposit.permanently-failed` event
    - Do NOT advance `nextRunAt` on failure
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 5.11 Write property test for execution record creation — Property 6: Execution record created for every attempt
    - **Property 6: Execution record created per attempt**
    - **Validates: Requirements 2.4, 3.4**
    - Generate success and failure scenarios; assert a `DepositExecutionRecord` is created with correct `status`, `attemptNumber`, and `executedAt`
    - Tag: `// Feature: savings-auto-deposit, Property 6: Execution record is created for every attempt`

  - [ ]* 5.12 Write property test for nextRunAt unchanged on failure — Property 5: nextRunAt does not advance on failed attempt
    - **Property 5: nextRunAt unchanged on failure**
    - **Validates: Requirements 3.5**
    - Generate failed attempts with `attemptNumber < 3`; assert `nextRunAt` is unchanged after the failed execution
    - Tag: `// Feature: savings-auto-deposit, Property 5: nextRunAt does not advance on failed attempt`

  - [ ] 5.13 Wire `@Cron('* * * * *')` decorator onto the scheduler tick method
    - Annotate the main scheduler method with `@Cron(CronExpression.EVERY_MINUTE)`
    - _Requirements: 2.1_

- [ ] 6. Checkpoint — Ensure all scheduler tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement `AutoDepositController`
  - [ ] 7.1 Implement CRUD and pause/resume/cancel endpoints
    - `GET /savings/auto-deposit/analytics` — `@Roles('admin')` + `RolesGuard`, return `AnalyticsResponseDto`
    - `GET /savings/auto-deposit` — `@UseGuards(JwtAuthGuard)`, return array of `RecurringDepositResponseDto`
    - `GET /savings/auto-deposit/:id` — `@UseGuards(JwtAuthGuard)`, return `RecurringDepositResponseDto`
    - `POST /savings/auto-deposit` — `@UseGuards(JwtAuthGuard)`, body `CreateRecurringDepositDto`, return `RecurringDepositResponseDto`
    - `PATCH /savings/auto-deposit/:id/pause` — `@UseGuards(JwtAuthGuard)`
    - `PATCH /savings/auto-deposit/:id/resume` — `@UseGuards(JwtAuthGuard)`
    - `DELETE /savings/auto-deposit/:id` — `@UseGuards(JwtAuthGuard)`, return 204
    - Declare `/analytics` route before `/:id` to avoid NestJS routing ambiguity
    - Add `@ApiTags`, `@ApiBearerAuth`, `@ApiResponse` Swagger decorators on all endpoints
    - _Requirements: 1.6, 1.7, 5.6, 5.7, 6.4, 7.4, 8.2, 8.3_

- [ ] 8. Add `sendPreDepositEmail` to `MailService`
  - Modify `backend/src/mail/mail.service.ts` to add `sendPreDepositEmail(to: string, context: { amount: number; productName: string; nextRunAt: Date }): Promise<void>`
  - Use existing mailer transport pattern; include amount, product name, and UTC timestamp in the email template context
  - _Requirements: 4.1, 4.2_

- [ ] 9. Create `AutoDepositModule` and wire into `AppModule`
  - [ ] 9.1 Create `auto-deposit.module.ts`
    - Import `TypeOrmModule.forFeature([RecurringDeposit, DepositExecutionRecord])`
    - Import `MailModule`, `BlockchainModule`, `SavingsModule`, `EventEmitterModule`, `ScheduleModule`
    - Declare `AutoDepositController`; provide `AutoDepositService`, `DepositSchedulerService`
    - _Requirements: 1.1, 2.1_

  - [ ] 9.2 Register `ScheduleModule.forRoot()` and `AutoDepositModule` in `AppModule`
    - Modify `backend/src/app.module.ts`
    - Add `ScheduleModule.forRoot()` to imports if not already present
    - Add `AutoDepositModule` to imports
    - _Requirements: 2.1_

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The `/analytics` route must be declared before `/:id` in the controller to prevent NestJS routing ambiguity
- Property tests use `fast-check` with a minimum of 100 iterations each
- Redis distributed lock key: e.g. `lock:deposit-scheduler`; TTL should be slightly less than the cron interval (55s)
- `notificationSentForCurrentRun` must be reset to `false` whenever `nextRunAt` advances (on success or resume)
- All `date-fns` operations should use UTC-aware variants to avoid DST edge cases
