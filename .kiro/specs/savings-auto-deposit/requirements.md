# Requirements Document

## Introduction

This feature allows users to configure automatic recurring deposits to their savings accounts on a daily, weekly, or monthly schedule. The system will execute deposits automatically via a cron job, handle failures with retry logic, notify users before each deposit via email, and provide pause/resume controls. Analytics will track auto-deposit adoption across the platform.

## Glossary

- **AutoDeposit**: The Savings Auto-Deposit feature module responsible for managing recurring deposit schedules.
- **RecurringDeposit**: An entity representing a user's configured automatic deposit schedule, including amount, frequency, and status.
- **Deposit_Scheduler**: The cron-based service responsible for evaluating and executing due recurring deposits.
- **Deposit_Executor**: The service component responsible for performing the actual deposit transaction via BlockchainSavingsService.
- **Retry_Handler**: The component responsible for retrying failed deposit attempts according to the retry policy.
- **MailService**: The existing service responsible for sending transactional emails to users.
- **NotificationsService**: The existing event-driven notification service.
- **SavingsService**: The existing service managing savings account operations.
- **User**: An authenticated platform user identified by a unique ID and email address.
- **Schedule**: The recurrence configuration for a RecurringDeposit, one of: `daily`, `weekly`, or `monthly`.
- **Deposit_Status**: The current state of a RecurringDeposit: `active`, `paused`, or `cancelled`.
- **Execution_Record**: A log entry capturing the outcome of a single deposit execution attempt.

---

## Requirements

### Requirement 1: Configure a Recurring Deposit

**User Story:** As a user, I want to set up an automatic recurring deposit to my savings account, so that I can grow my savings consistently without manual intervention.

#### Acceptance Criteria

1. WHEN a user submits a POST request to `/savings/auto-deposit` with a valid schedule, amount, and target savings product ID, THE AutoDeposit SHALL create a RecurringDeposit entity associated with the authenticated user.
2. THE RecurringDeposit SHALL store: `userId`, `productId`, `amount`, `schedule` (daily/weekly/monthly), `status` (defaulting to `active`), `nextRunAt` (computed from schedule), `createdAt`, and `updatedAt`.
3. IF the provided `amount` is below the target SavingsProduct's `minAmount`, THEN THE AutoDeposit SHALL return a 422 Unprocessable Entity error with a descriptive message.
4. IF the provided `productId` does not correspond to an active SavingsProduct, THEN THE AutoDeposit SHALL return a 404 Not Found error.
5. IF the authenticated user already has an `active` RecurringDeposit for the same `productId`, THEN THE AutoDeposit SHALL return a 409 Conflict error.
6. THE AutoDeposit SHALL require a valid JWT via JwtAuthGuard on the POST `/savings/auto-deposit` endpoint.
7. THE AutoDeposit SHALL document the POST `/savings/auto-deposit` endpoint with Swagger/OpenAPI decorators.

---

### Requirement 2: Execute Scheduled Deposits

**User Story:** As a platform operator, I want the system to automatically execute recurring deposits on schedule, so that users' savings grow without requiring manual action.

#### Acceptance Criteria

1. THE Deposit_Scheduler SHALL evaluate all RecurringDeposit records with `status = active` and `nextRunAt <= current UTC time` at a regular polling interval not exceeding 1 minute.
2. WHEN a RecurringDeposit is due, THE Deposit_Executor SHALL invoke BlockchainSavingsService to perform the deposit for the configured `amount` and `productId`.
3. WHEN a deposit executes successfully, THE Deposit_Scheduler SHALL update `nextRunAt` to the next occurrence based on the RecurringDeposit's `schedule`.
4. WHEN a deposit executes successfully, THE Deposit_Scheduler SHALL create an Execution_Record with `status = success` and the execution timestamp.
5. THE Deposit_Scheduler SHALL process due deposits concurrently to avoid blocking on individual transactions, subject to a configurable concurrency limit.

---

### Requirement 3: Retry Logic for Failed Deposits

**User Story:** As a user, I want failed automatic deposits to be retried automatically, so that transient errors do not permanently interrupt my savings schedule.

#### Acceptance Criteria

1. WHEN a deposit execution fails, THE Retry_Handler SHALL schedule a retry attempt with an exponential backoff delay starting at 5 minutes, doubling on each subsequent failure.
2. THE Retry_Handler SHALL attempt a maximum of 3 retry attempts per scheduled deposit occurrence before marking the Execution_Record as `permanently_failed`.
3. WHEN all retry attempts are exhausted for a deposit occurrence, THE AutoDeposit SHALL emit a `recurring-deposit.permanently-failed` event via EventEmitterModule.
4. WHEN a deposit execution fails on any attempt, THE Deposit_Scheduler SHALL create an Execution_Record with `status = failed`, the attempt number, and the error message.
5. THE Retry_Handler SHALL NOT advance `nextRunAt` until a deposit occurrence either succeeds or is permanently failed.

---

### Requirement 4: Email Notification Before Each Deposit

**User Story:** As a user, I want to receive an email notification before each automatic deposit is executed, so that I am aware of upcoming charges and can take action if needed.

#### Acceptance Criteria

1. WHEN a RecurringDeposit's `nextRunAt` is within 24 hours of the current UTC time, THE AutoDeposit SHALL send a pre-deposit notification email to the associated User's email address via MailService.
2. THE pre-deposit notification email SHALL include: the scheduled deposit amount, the target savings product name, and the scheduled execution time in UTC.
3. THE AutoDeposit SHALL ensure a pre-deposit notification email is sent at most once per deposit occurrence to avoid duplicate notifications.
4. IF MailService fails to deliver the pre-deposit notification email, THEN THE AutoDeposit SHALL log the failure and continue with deposit execution without blocking it.

---

### Requirement 5: Pause and Resume a Recurring Deposit

**User Story:** As a user, I want to pause and resume my recurring deposit schedule, so that I can temporarily stop automatic deposits without losing my configuration.

#### Acceptance Criteria

1. WHEN a user submits a PATCH request to `/savings/auto-deposit/:id/pause`, THE AutoDeposit SHALL set the RecurringDeposit's `status` to `paused` and return the updated entity.
2. WHEN a user submits a PATCH request to `/savings/auto-deposit/:id/resume`, THE AutoDeposit SHALL set the RecurringDeposit's `status` to `active`, recompute `nextRunAt` from the current UTC time based on the configured `schedule`, and return the updated entity.
3. IF the RecurringDeposit identified by `:id` does not belong to the authenticated user, THEN THE AutoDeposit SHALL return a 403 Forbidden error.
4. IF the RecurringDeposit identified by `:id` does not exist, THEN THE AutoDeposit SHALL return a 404 Not Found error.
5. WHILE a RecurringDeposit has `status = paused`, THE Deposit_Scheduler SHALL skip the record during deposit evaluation.
6. THE AutoDeposit SHALL require a valid JWT via JwtAuthGuard on the PATCH `/savings/auto-deposit/:id/pause` and PATCH `/savings/auto-deposit/:id/resume` endpoints.
7. THE AutoDeposit SHALL document the pause and resume endpoints with Swagger/OpenAPI decorators.

---

### Requirement 6: Retrieve Recurring Deposit Configuration

**User Story:** As a user, I want to view my recurring deposit configurations, so that I can review and manage my savings automation settings.

#### Acceptance Criteria

1. WHEN a user submits a GET request to `/savings/auto-deposit`, THE AutoDeposit SHALL return all RecurringDeposit records belonging to the authenticated user.
2. WHEN a user submits a GET request to `/savings/auto-deposit/:id`, THE AutoDeposit SHALL return the RecurringDeposit identified by `:id` if it belongs to the authenticated user.
3. IF the RecurringDeposit identified by `:id` does not belong to the authenticated user, THEN THE AutoDeposit SHALL return a 403 Forbidden error.
4. THE AutoDeposit SHALL require a valid JWT via JwtAuthGuard on the GET `/savings/auto-deposit` and GET `/savings/auto-deposit/:id` endpoints.

---

### Requirement 7: Cancel a Recurring Deposit

**User Story:** As a user, I want to cancel a recurring deposit, so that I can permanently stop automatic deposits when I no longer need them.

#### Acceptance Criteria

1. WHEN a user submits a DELETE request to `/savings/auto-deposit/:id`, THE AutoDeposit SHALL set the RecurringDeposit's `status` to `cancelled` and return a 204 No Content response.
2. IF the RecurringDeposit identified by `:id` does not belong to the authenticated user, THEN THE AutoDeposit SHALL return a 403 Forbidden error.
3. WHILE a RecurringDeposit has `status = cancelled`, THE Deposit_Scheduler SHALL skip the record during deposit evaluation.
4. THE AutoDeposit SHALL require a valid JWT via JwtAuthGuard on the DELETE `/savings/auto-deposit/:id` endpoint.

---

### Requirement 8: Analytics for Auto-Deposit Adoption

**User Story:** As a platform operator, I want analytics on auto-deposit adoption, so that I can measure feature usage and inform product decisions.

#### Acceptance Criteria

1. WHEN a user submits a GET request to `/savings/auto-deposit/analytics` with an admin role, THE AutoDeposit SHALL return aggregate metrics including: total active RecurringDeposit count, total paused count, total cancelled count, total successful executions in the last 30 days, and total permanently failed executions in the last 30 days.
2. THE AutoDeposit SHALL require admin role authorization on the GET `/savings/auto-deposit/analytics` endpoint.
3. THE AutoDeposit SHALL document the analytics endpoint with Swagger/OpenAPI decorators.
