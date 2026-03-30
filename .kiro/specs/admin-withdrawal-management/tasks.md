# Implementation Plan: Admin Withdrawal Management

## Overview

This implementation adds an admin-facing API for managing withdrawal requests. The feature follows existing admin module patterns (JWT + RBAC guards, paginated responses, audit logging) and integrates with the existing `SavingsService` withdrawal processing flow.

## Tasks

- [x] 1. Create DTOs and update entities
  - [x] 1.1 Create RejectWithdrawalDto with validation
    - Create `backend/src/modules/admin/dto/reject-withdrawal.dto.ts`
    - Add `@IsString()` and `@IsNotEmpty()` decorators for `reason` field
    - _Requirements: 4.2_

  - [x] 1.2 Create WithdrawalStatsDto interface
    - Create `backend/src/modules/admin/dto/withdrawal-stats.dto.ts`
    - Define interface with `total`, `byStatus`, `approvalRate`, and `averageProcessingTimeMs` fields
    - _Requirements: 5.1_

- [x] 2. Extend MailService with approval and rejection emails
  - [x] 2.1 Add sendWithdrawalApprovedEmail method
    - Add method to `backend/src/modules/mail/mail.service.ts`
    - Accept parameters: `userEmail`, `name`, `amount`, `penalty`, `netAmount`
    - Follow existing fire-and-forget pattern with try/catch and logging
    - _Requirements: 3.5, 6.1_

  - [x] 2.2 Add sendWithdrawalRejectedEmail method
    - Add method to `backend/src/modules/mail/mail.service.ts`
    - Accept parameters: `userEmail`, `name`, `reason`
    - Follow existing fire-and-forget pattern with try/catch and logging
    - _Requirements: 4.6, 6.2_

  - [ ]\* 2.3 Write unit tests for new MailService methods
    - Test successful email sending
    - Test error handling and logging when mail fails
    - Verify fire-and-forget behavior (no exceptions thrown)
    - _Requirements: 6.3_

- [x] 3. Implement AdminWithdrawalService
  - [x] 3.1 Create AdminWithdrawalService with dependencies
    - Create `backend/src/modules/admin/admin-withdrawal.service.ts`
    - Inject `WithdrawalRequest` repository, `User` repository, `AuditLog` repository, `SavingsService`, and `MailService`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 7.1_

  - [x] 3.2 Implement listPending method
    - Accept `PageOptionsDto` parameter
    - Query `WithdrawalRequest` where `status = PENDING`
    - Order by `createdAt` in direction specified by `order` parameter (default ASC)
    - Return `PageDto<WithdrawalRequest>` with pagination metadata
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ]\* 3.3 Write property test for listPending
    - **Property 1: Pending list returns only PENDING records, correctly paginated and ordered**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Generate random arrays of withdrawal requests with mixed statuses
    - Verify only PENDING records returned, correct pagination, correct ordering

  - [x] 3.4 Implement getDetail method
    - Accept withdrawal `id` parameter
    - Query `WithdrawalRequest` with `subscription` relation
    - Throw `NotFoundException` if not found
    - _Requirements: 2.1, 2.2_

  - [ ]\* 3.5 Write property test for getDetail
    - **Property 2: Non-existent resource returns 404**
    - **Validates: Requirements 2.2**
    - Generate random UUIDs not in database
    - Verify 404 response for non-existent IDs

  - [x] 3.6 Implement approve method
    - Accept withdrawal `id` and `actor` (User) parameters
    - Load withdrawal request, throw `NotFoundException` if not found
    - Throw `BadRequestException` if status is not PENDING
    - Update status to PROCESSING
    - Call `SavingsService.processWithdrawal` to trigger processing flow
    - Write audit log entry with all required fields
    - Send approval email via MailService (wrapped in try/catch)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]\* 3.7 Write property tests for approve method
    - **Property 3: Approving a non-PENDING withdrawal returns 400**
    - **Validates: Requirements 3.3**
    - Generate withdrawal requests with status ∈ {PROCESSING, COMPLETED, FAILED}
    - Verify 400 response and no status change

  - [ ]\* 3.8 Write property test for approve status transition
    - **Property 5: Approve transitions status to PROCESSING**
    - **Validates: Requirements 3.1**
    - Generate PENDING withdrawal requests
    - Verify status updated to PROCESSING after approval

  - [ ]\* 3.9 Write property test for approve email
    - **Property 10: Approval email is sent with correct financial fields**
    - **Validates: Requirements 3.5, 6.1**
    - Generate PENDING requests with various amounts
    - Verify MailService called with correct email, name, amount, penalty, netAmount

  - [x] 3.10 Implement reject method
    - Accept withdrawal `id`, `reason`, and `actor` (User) parameters
    - Load withdrawal request, throw `NotFoundException` if not found
    - Throw `BadRequestException` if status is not PENDING
    - Update status to FAILED and persist reason
    - Write audit log entry with all required fields
    - Send rejection email via MailService (wrapped in try/catch)
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6_

  - [ ]\* 3.11 Write property tests for reject method
    - **Property 4: Rejecting a non-PENDING withdrawal returns 400**
    - **Validates: Requirements 4.4**
    - Generate withdrawal requests with status ∈ {PROCESSING, COMPLETED, FAILED}
    - Verify 400 response and no status change

  - [ ]\* 3.12 Write property test for reject status transition
    - **Property 6: Reject transitions status to FAILED and persists reason**
    - **Validates: Requirements 4.1**
    - Generate PENDING requests with non-empty reasons
    - Verify status = FAILED and reason persisted correctly

  - [ ]\* 3.13 Write property test for reject email
    - **Property 11: Rejection email is sent with the rejection reason**
    - **Validates: Requirements 4.6, 6.2**
    - Generate PENDING requests with various reasons
    - Verify MailService called with correct email, name, and reason

  - [x] 3.14 Implement getStats method
    - Query all withdrawal requests
    - Calculate total count
    - Calculate count by each WithdrawalStatus value
    - Calculate approval rate: (COMPLETED count / total) \* 100 (or 0 if total is 0)
    - Calculate average processing time: mean of (completedAt - createdAt) for COMPLETED records (or 0 if none exist)
    - Return WithdrawalStatsDto
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]\* 3.15 Write property test for getStats
    - **Property 13: Stats correctly aggregate all withdrawal requests**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Generate random sets of withdrawal requests with varying statuses and completedAt values
    - Verify total, byStatus counts, approvalRate, and averageProcessingTimeMs calculations

  - [ ]\* 3.16 Write unit tests for AdminWithdrawalService
    - Test listPending returns empty result when no PENDING requests exist
    - Test getDetail throws NotFoundException for unknown ID
    - Test approve throws NotFoundException for unknown ID
    - Test approve throws BadRequestException for non-PENDING status
    - Test approve calls SavingsService.processWithdrawal
    - Test approve writes audit log
    - Test reject throws NotFoundException for unknown ID
    - Test reject throws BadRequestException for non-PENDING status
    - Test reject persists reason and FAILED status
    - Test reject writes audit log
    - Test getStats returns all-zero result for empty database
    - Test getStats returns averageProcessingTimeMs = 0 when no COMPLETED records
    - Test mail failure does not abort operation (mock MailService to throw)
    - _Requirements: 1.5, 2.2, 3.2, 3.3, 3.4, 4.3, 4.4, 5.2, 5.3, 6.3_

- [ ] 4. Checkpoint - Ensure service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement AdminWithdrawalController
  - [x] 5.1 Create AdminWithdrawalController with guards and versioning
    - Create `backend/src/modules/admin/admin-withdrawal.controller.ts`
    - Add `@Controller('admin/withdrawals')` decorator
    - Add `@ApiTags('admin-withdrawals')` for Swagger documentation
    - Add `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.ADMIN)` decorators
    - Set version to '1' using `@Version('1')`
    - Inject `AdminWithdrawalService`
    - _Requirements: 1.4, 2.3, 3.6, 4.7, 5.4_

  - [x] 5.2 Implement GET /stats endpoint
    - Add `@Get('stats')` method (must be declared before `/:id` to avoid route shadowing)
    - Call `adminWithdrawalService.getStats()`
    - Return `WithdrawalStatsDto`
    - _Requirements: 5.1_

  - [x] 5.3 Implement GET /pending endpoint
    - Add `@Get('pending')` method (must be declared before `/:id` to avoid route shadowing)
    - Accept `@Query()` parameter of type `PageOptionsDto`
    - Call `adminWithdrawalService.listPending(opts)`
    - Return `PageDto<WithdrawalRequest>`
    - _Requirements: 1.1, 1.2_

  - [x] 5.4 Implement GET /:id endpoint
    - Add `@Get(':id')` method
    - Accept `@Param('id')` parameter
    - Call `adminWithdrawalService.getDetail(id)`
    - Return `WithdrawalRequest`
    - _Requirements: 2.1_

  - [x] 5.5 Implement POST /:id/approve endpoint
    - Add `@Post(':id/approve')` method
    - Accept `@Param('id')` and `@CurrentUser()` decorator for actor
    - Call `adminWithdrawalService.approve(id, actor)`
    - Return updated `WithdrawalRequest`
    - _Requirements: 3.1_

  - [x] 5.6 Implement POST /:id/reject endpoint
    - Add `@Post(':id/reject')` method
    - Accept `@Param('id')`, `@Body()` of type `RejectWithdrawalDto`, and `@CurrentUser()` for actor
    - Validate reason is non-empty (handled by DTO validation)
    - Call `adminWithdrawalService.reject(id, body.reason, actor)`
    - Return updated `WithdrawalRequest`
    - _Requirements: 4.1, 4.2_

  - [ ]\* 5.7 Write property test for empty reason validation
    - **Property 7: Empty or whitespace reason is rejected**
    - **Validates: Requirements 4.2**
    - Generate whitespace-only strings
    - Verify 400 response from reject endpoint

  - [ ]\* 5.8 Write unit tests for AdminWithdrawalController
    - Test each endpoint delegates to service correctly
    - Test guards are applied (JWT + RBAC)
    - Test route ordering (stats and pending before :id)
    - _Requirements: 1.4, 2.3, 3.6, 4.7, 5.4_

- [x] 6. Implement audit logging
  - [x] 6.1 Add audit log writing to approve method
    - In `AdminWithdrawalService.approve`, write `AuditLog` entry
    - Populate: `correlationId`, `endpoint`, `method`, `action = APPROVE`, `actor`, `resourceId`, `resourceType = WITHDRAWAL_REQUEST`, `statusCode`, `durationMs`, `success`
    - Wrap in try/catch to prevent audit log failure from aborting operation
    - _Requirements: 3.4, 7.1, 7.2_

  - [x] 6.2 Add audit log writing to reject method
    - In `AdminWithdrawalService.reject`, write `AuditLog` entry
    - Populate: `correlationId`, `endpoint`, `method`, `action = REJECT`, `actor`, `resourceId`, `resourceType = WITHDRAWAL_REQUEST`, `statusCode`, `durationMs`, `success`
    - Wrap in try/catch to prevent audit log failure from aborting operation
    - _Requirements: 4.5, 7.1, 7.2_

  - [x] 6.3 Add error audit logging
    - In both approve and reject methods, catch errors and write audit log with `success = false` and `errorMessage`
    - _Requirements: 7.3_

  - [ ]\* 6.4 Write property tests for audit logging
    - **Property 8: Audit log is written with all required fields for every mutating action**
    - **Validates: Requirements 3.4, 4.5, 7.1, 7.2**
    - Generate approve/reject actions
    - Verify audit log has all required non-null fields

  - [ ]\* 6.5 Write property test for failed operation audit logging
    - **Property 9: Failed operations produce audit log entries with success = false**
    - **Validates: Requirements 7.3**
    - Mock service to throw errors
    - Verify audit log has success = false and non-null errorMessage

  - [ ]\* 6.6 Write property test for mail failure resilience
    - **Property 12: Mail failure does not abort the operation**
    - **Validates: Requirements 6.3**
    - Mock MailService to throw exceptions
    - Verify operation completes successfully (status updated, audit log written)
    - Verify mail error does not propagate to caller

- [x] 7. Update AdminModule configuration
  - [x] 7.1 Register new entities and services in AdminModule
    - Update `backend/src/modules/admin/admin.module.ts`
    - Add `WithdrawalRequest` and `AuditLog` to `TypeOrmModule.forFeature([...])`
    - Add `AdminWithdrawalController` to controllers array
    - Add `AdminWithdrawalService` to providers array
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 7.1_

- [ ] 8. Final checkpoint - Integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check library with minimum 100 iterations
- Audit logging is wrapped in try/catch to prevent failures from aborting primary operations
- Mail sending follows fire-and-forget pattern (errors logged but not thrown)
- Route ordering in controller is critical: `/stats` and `/pending` must be declared before `/:id`
