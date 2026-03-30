# Requirements Document

## Introduction

This feature adds an admin-facing API for reviewing and managing withdrawal requests in the Nestera backend. Admins can list pending requests, inspect individual requests, approve or reject them with optional reasons, view aggregate statistics, and receive audit trails for all actions. Users are notified by email when their withdrawal request is approved or rejected.

## Glossary

- **Admin_API**: The NestJS controller layer secured with `JwtAuthGuard`, `RolesGuard`, and `Role.ADMIN` that exposes the `/admin/withdrawals` endpoints.
- **WithdrawalRequest**: The `withdrawal_requests` database entity representing a user's request to withdraw funds from a savings subscription.
- **WithdrawalStatus**: Enum with values `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
- **AdminWithdrawalService**: The NestJS service that implements the business logic for admin withdrawal management.
- **AuditLog**: The `audit_logs` database entity that records every admin action with actor, resource, timestamp, and outcome.
- **MailService**: The existing NestJS mail service used to send transactional emails to users.
- **PageOptionsDto**: The shared DTO for pagination parameters (`page`, `limit`, `order`).
- **PageDto**: The shared paginated response wrapper containing `data` and `meta`.
- **Actor**: The authenticated admin user performing an action, identified by email.

---

## Requirements

### Requirement 1: List Pending Withdrawal Requests

**User Story:** As an admin, I want to list all pending withdrawal requests, so that I can review and prioritize which ones to process.

#### Acceptance Criteria

1. WHEN a `GET /admin/withdrawals/pending` request is received, THE Admin_API SHALL return a paginated `PageDto` of `WithdrawalRequest` records where `status = PENDING`.
2. THE Admin_API SHALL accept `PageOptionsDto` query parameters (`page`, `limit`, `order`) for the pending list endpoint.
3. THE Admin_API SHALL order results by `createdAt` in the direction specified by the `order` parameter, defaulting to `ASC`.
4. THE Admin_API SHALL require a valid JWT token with `Role.ADMIN` to access the pending list endpoint; requests without valid admin credentials SHALL receive a `401` or `403` response.
5. WHEN no pending withdrawal requests exist, THE Admin_API SHALL return an empty `data` array with correct pagination `meta`.

---

### Requirement 2: Get Withdrawal Request Detail

**User Story:** As an admin, I want to view the full details of a specific withdrawal request, so that I can make an informed approval or rejection decision.

#### Acceptance Criteria

1. WHEN a `GET /admin/withdrawals/:id` request is received with a valid UUID, THE Admin_API SHALL return the full `WithdrawalRequest` record including its nested `subscription` relation.
2. IF the requested `id` does not correspond to an existing `WithdrawalRequest`, THEN THE Admin_API SHALL return a `404 Not Found` response with a descriptive error message.
3. THE Admin_API SHALL require a valid JWT token with `Role.ADMIN`; requests without valid admin credentials SHALL receive a `401` or `403` response.

---

### Requirement 3: Approve a Withdrawal Request

**User Story:** As an admin, I want to approve a pending withdrawal request, so that the user's funds are released and they are notified.

#### Acceptance Criteria

1. WHEN a `POST /admin/withdrawals/:id/approve` request is received for a `PENDING` withdrawal, THE AdminWithdrawalService SHALL update the `WithdrawalRequest` status to `PROCESSING` and trigger the existing withdrawal processing flow.
2. IF the `WithdrawalRequest` with the given `id` does not exist, THEN THE Admin_API SHALL return a `404 Not Found` response.
3. IF the `WithdrawalRequest` status is not `PENDING` at the time of the approve request, THEN THE Admin_API SHALL return a `400 Bad Request` response with a message indicating the request is not in a pending state.
4. WHEN a withdrawal is approved, THE AdminWithdrawalService SHALL write an `AuditLog` entry recording the actor's email, the `WithdrawalRequest` id as `resourceId`, `resourceType = WITHDRAWAL_REQUEST`, and `action = APPROVE`.
5. WHEN a withdrawal is approved, THE MailService SHALL send an approval notification email to the user associated with the `WithdrawalRequest`.
6. THE Admin_API SHALL require a valid JWT token with `Role.ADMIN`; requests without valid admin credentials SHALL receive a `401` or `403` response.

---

### Requirement 4: Reject a Withdrawal Request

**User Story:** As an admin, I want to reject a pending withdrawal request with a reason, so that the user understands why their request was denied.

#### Acceptance Criteria

1. WHEN a `POST /admin/withdrawals/:id/reject` request is received with a non-empty `reason` string, THE AdminWithdrawalService SHALL update the `WithdrawalRequest` status to `FAILED` and persist the `reason` field.
2. IF the `reason` field is absent or empty in the reject request body, THEN THE Admin_API SHALL return a `400 Bad Request` response.
3. IF the `WithdrawalRequest` with the given `id` does not exist, THEN THE Admin_API SHALL return a `404 Not Found` response.
4. IF the `WithdrawalRequest` status is not `PENDING` at the time of the reject request, THEN THE Admin_API SHALL return a `400 Bad Request` response with a message indicating the request is not in a pending state.
5. WHEN a withdrawal is rejected, THE AdminWithdrawalService SHALL write an `AuditLog` entry recording the actor's email, the `WithdrawalRequest` id as `resourceId`, `resourceType = WITHDRAWAL_REQUEST`, and `action = REJECT`.
6. WHEN a withdrawal is rejected, THE MailService SHALL send a rejection notification email including the rejection reason to the user associated with the `WithdrawalRequest`.
7. THE Admin_API SHALL require a valid JWT token with `Role.ADMIN`; requests without valid admin credentials SHALL receive a `401` or `403` response.

---

### Requirement 5: Withdrawal Statistics

**User Story:** As an admin, I want to view aggregate statistics on withdrawal requests, so that I can monitor approval rates and processing performance.

#### Acceptance Criteria

1. WHEN a `GET /admin/withdrawals/stats` request is received, THE Admin_API SHALL return a statistics object containing: total withdrawal request count, count by each `WithdrawalStatus` value, approval rate as a percentage (approved count / total count × 100), and average processing time in milliseconds for `COMPLETED` requests (calculated as the mean of `completedAt - createdAt`).
2. WHEN no `COMPLETED` withdrawal requests exist, THE Admin_API SHALL return `averageProcessingTimeMs = 0` for the average processing time field.
3. WHEN no withdrawal requests exist at all, THE Admin_API SHALL return all counts as `0` and `approvalRate = 0`.
4. THE Admin_API SHALL require a valid JWT token with `Role.ADMIN`; requests without valid admin credentials SHALL receive a `401` or `403` response.

---

### Requirement 6: Email Notifications for Approval and Rejection

**User Story:** As a user, I want to receive an email when my withdrawal request is approved or rejected, so that I am kept informed of the outcome.

#### Acceptance Criteria

1. WHEN a withdrawal request is approved, THE MailService SHALL send an email to the user's registered email address containing the withdrawal amount, penalty amount, and net amount.
2. WHEN a withdrawal request is rejected, THE MailService SHALL send an email to the user's registered email address containing the rejection reason.
3. IF the MailService fails to send an email, THEN THE AdminWithdrawalService SHALL log the error and continue without throwing an exception, so that the approval or rejection action is not rolled back.
4. THE MailService SHALL add `sendWithdrawalApprovedEmail(userEmail, name, amount, penalty, netAmount)` and `sendWithdrawalRejectedEmail(userEmail, name, reason)` methods to support the new notification types.

---

### Requirement 7: Audit Logging for Admin Actions

**User Story:** As a compliance officer, I want every admin action on withdrawal requests to be recorded in an audit log, so that there is a traceable history of all decisions.

#### Acceptance Criteria

1. THE AdminWithdrawalService SHALL write an `AuditLog` record for every approve and reject action before returning a response to the caller.
2. WHEN an `AuditLog` entry is written, THE AdminWithdrawalService SHALL populate: `correlationId` from the request context, `endpoint` with the request path, `method` with the HTTP method, `action` with `APPROVE` or `REJECT`, `actor` with the authenticated admin's email, `resourceId` with the `WithdrawalRequest` UUID, `resourceType` with `WITHDRAWAL_REQUEST`, `statusCode` with the HTTP response code, `durationMs` with the elapsed time in milliseconds, and `success` with `true` for successful operations.
3. IF an approve or reject operation fails, THEN THE AdminWithdrawalService SHALL write an `AuditLog` entry with `success = false` and `errorMessage` populated with the error description.
4. THE AdminWithdrawalService SHALL persist `AuditLog` entries using the existing `AuditLog` TypeORM entity and repository.
