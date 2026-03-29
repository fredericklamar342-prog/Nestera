# Implementation Plan: GraphQL API Support

## Overview

Add a GraphQL API layer to the NestJS backend using `@nestjs/graphql` + Apollo Server (code-first). Resolvers live inside their domain modules and delegate to existing services. REST API remains untouched throughout.

## Tasks

- [ ] 1. Install dependencies and configure GraphQL module
  - Run `pnpm add @nestjs/graphql @nestjs/apollo @apollo/server graphql dataloader graphql-scalars` and `pnpm add -D fast-check @types/dataloader`
  - Register `GraphQLModule.forRootAsync<ApolloDriverConfig>` in `app.module.ts` with `ApolloDriver`, `autoSchemaFile: join(process.cwd(), 'src/schema.gql')`, `sortSchema: true`, and playground gated on `NODE_ENV === 'development'` via `ConfigService`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 2. Create shared GraphQL infrastructure
  - [ ] 2.1 Create `GqlContext` and `DataLoaders` interfaces in `src/common/dataloader/dataloader.factory.ts` and implement `DataLoaderFactory` service with `userLoader` and `savingsProductLoader` batch functions using `WHERE id IN (...)`
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [ ]* 2.2 Write property test for DataLoader batching (Property 7)
    - **Property 7: DataLoader batches per-request, not cross-request**
    - **Validates: Requirements 5.1, 5.2, 5.5**
  - [ ] 2.3 Create `GqlJwtAuthGuard` in `src/common/guards/gql-jwt-auth.guard.ts` extending `JwtAuthGuard` and overriding `getRequest` to extract the request from `GqlExecutionContext`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ] 2.4 Create `GqlCurrentUser` param decorator in `src/common/decorators/gql-current-user.decorator.ts` using `GqlExecutionContext`
    - _Requirements: 6.2_
  - [ ] 2.5 Create `PaginatedResult<T>` generic factory function in `src/common/graphql/paginated-result.type.ts` with `items`, `total`, `page`, `pageSize` fields
    - _Requirements: 2.5_
  - [ ] 2.6 Create `GqlHttpExceptionFilter` in `src/common/filters/gql-http-exception.filter.ts` mapping `HttpException` status codes to `ForbiddenError`, `AuthenticationError`, `UserInputError`, and `ApolloError`
    - _Requirements: 4.7, 4.8_
  - [ ] 2.7 Wire `DataLoaderFactory` into `GraphQLModule.forRootAsync` context callback so each request gets fresh loader instances; register `GqlHttpExceptionFilter` as a global filter in `app.module.ts`
    - _Requirements: 5.1, 5.5_

- [ ] 3. Checkpoint — Ensure the app compiles and existing REST tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement User GraphQL types and resolver
  - [ ] 4.1 Create `UserType` ObjectType in `src/modules/user/graphql/user.type.ts` exposing only non-sensitive fields (exclude `password`, `nonce`, `kycRejectionReason`, `sweepThreshold`, `defaultSavingsProductId`, `autoSweepEnabled`)
    - _Requirements: 2.1, 2.2_
  - [ ] 4.2 Create `UserResolver` in `src/modules/user/user.resolver.ts` with a `me` query guarded by `GqlJwtAuthGuard`; add resolver to `UserModule` providers
    - _Requirements: 3.1, 6.5_
  - [ ]* 4.3 Write property test for sensitive field exclusion (Property 2)
    - **Property 2: Sensitive fields excluded from User type**
    - **Validates: Requirements 2.2**
  - [ ]* 4.4 Write unit tests for `UserResolver`
    - Test `me` returns user data; test unauthenticated request is rejected
    - _Requirements: 3.1, 6.3_

- [ ] 5. Implement Savings GraphQL types and resolver
  - [ ] 5.1 Create ObjectTypes in `src/modules/savings/graphql/`: `SavingsProductType`, `UserSubscriptionType` (with nested `product: SavingsProductType`), `SavingsGoalType`; create `PaginatedSavingsProducts` concrete type
    - _Requirements: 2.1, 2.3, 2.5_
  - [ ] 5.2 Create InputTypes in `src/modules/savings/graphql/savings-goal.input.ts`: `CreateSavingsGoalInput`, `UpdateSavingsGoalInput`; create `PaginationArgs` ArgsType
    - _Requirements: 2.4_
  - [ ] 5.3 Create `SavingsResolver` in `src/modules/savings/savings.resolver.ts` with queries `savingsProducts(PaginationArgs)`, `savingsProduct(id)`, `mySubscriptions`, `myGoals` and mutations `createSavingsGoal`, `updateSavingsGoal`; add to `SavingsModule` providers
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 6.5, 6.6_
  - [ ]* 5.4 Write property test for paginated list invariants (Property 4)
    - **Property 4: Paginated list invariants — items.length <= pageSize and total >= items.length**
    - **Validates: Requirements 2.5, 3.2**
  - [ ]* 5.5 Write property test for mutation ownership enforcement (Property 8)
    - **Property 8: updateSavingsGoal by non-owner always throws ForbiddenError**
    - **Validates: Requirements 4.8**
  - [ ]* 5.6 Write property test for business rule violations (Property 9)
    - **Property 9: createSavingsGoal with past targetDate always throws UserInputError**
    - **Validates: Requirements 4.7**
  - [ ]* 5.7 Write unit tests for `SavingsResolver`
    - Test all queries and mutations; test auth guards; test delegation to `SavingsService`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.1, 4.2_

- [ ] 6. Implement Notifications GraphQL types and resolver
  - [ ] 6.1 Create `NotificationType` and `NotificationPreferenceType` ObjectTypes in `src/modules/notifications/graphql/notification.type.ts`; create `PaginatedNotifications` concrete type
    - _Requirements: 2.1, 2.5_
  - [ ] 6.2 Create `UpdateNotificationPreferenceInput` InputType in `src/modules/notifications/graphql/notification.input.ts`
    - _Requirements: 2.4_
  - [ ] 6.3 Create `NotificationsResolver` in `src/modules/notifications/notifications.resolver.ts` with `myNotifications(PaginationArgs)` query and `markNotificationRead(id)`, `updateNotificationPreferences(input)` mutations; add to `NotificationsModule` providers
    - _Requirements: 3.6, 4.3, 4.4, 6.5_
  - [ ]* 6.4 Write unit tests for `NotificationsResolver`
    - Test paginated query, both mutations, and auth guard enforcement
    - _Requirements: 3.6, 4.3, 4.4_

- [ ] 7. Implement Transactions GraphQL types and resolver
  - [ ] 7.1 Create `TransactionType` ObjectType in `src/modules/transactions/graphql/transaction.type.ts`; create `PaginatedTransactions` concrete type
    - _Requirements: 2.1, 2.5_
  - [ ] 7.2 Create `TransactionsResolver` in `src/modules/transactions/transactions.resolver.ts` with `myTransactions(PaginationArgs)` query guarded by `GqlJwtAuthGuard`; add to `TransactionsModule` providers
    - _Requirements: 3.7, 6.5_
  - [ ]* 7.3 Write unit tests for `TransactionsResolver`
    - _Requirements: 3.7_

- [ ] 8. Implement Claims GraphQL types and resolver
  - [ ] 8.1 Create `ClaimType` ObjectType in `src/modules/claims/graphql/claim.type.ts`
    - _Requirements: 2.1_
  - [ ] 8.2 Create `CreateClaimInput` InputType in `src/modules/claims/graphql/claim.input.ts`
    - _Requirements: 2.4_
  - [ ] 8.3 Create `ClaimsResolver` in `src/modules/claims/claims.resolver.ts` with `myClaims` query and `createClaim(input)` mutation; add to `ClaimsModule` providers
    - _Requirements: 3.8, 4.5, 6.5_
  - [ ]* 8.4 Write unit tests for `ClaimsResolver`
    - _Requirements: 3.8, 4.5_

- [ ] 9. Implement Disputes GraphQL types and resolver
  - [ ] 9.1 Create `DisputeType` ObjectType in `src/modules/disputes/graphql/dispute.type.ts`
    - _Requirements: 2.1_
  - [ ] 9.2 Create `CreateDisputeInput` InputType in `src/modules/disputes/graphql/dispute.input.ts`
    - _Requirements: 2.4_
  - [ ] 9.3 Create `DisputesResolver` in `src/modules/disputes/disputes.resolver.ts` with `myDisputes` query and `createDispute(input)` mutation; add to `DisputesModule` providers
    - _Requirements: 3.9, 4.6, 6.5_
  - [ ]* 9.4 Write unit tests for `DisputesResolver`
    - _Requirements: 3.9, 4.6_

- [ ] 10. Implement Governance GraphQL types and resolver
  - [ ] 10.1 Create `GovernanceProposalType` ObjectType in `src/modules/governance/graphql/governance-proposal.type.ts`; create `PaginatedGovernanceProposals` concrete type
    - _Requirements: 2.1, 2.5_
  - [ ] 10.2 Create `GovernanceResolver` in `src/modules/governance/governance.resolver.ts` with public `governanceProposals(PaginationArgs)` query (no auth guard); add to `GovernanceModule` providers
    - _Requirements: 3.10, 6.7_
  - [ ]* 10.3 Write unit tests for `GovernanceResolver`
    - _Requirements: 3.10_

- [ ] 11. Checkpoint — Ensure all tests pass and schema.gql is generated
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Validate authentication and public access properties
  - [ ]* 12.1 Write property test for authenticated queries rejecting unauthenticated requests (Property 5)
    - **Property 5: Protected queries return UNAUTHENTICATED for any request without a valid JWT**
    - **Validates: Requirements 6.3, 6.5**
  - [ ]* 12.2 Write property test for public queries accessible without JWT (Property 6)
    - **Property 6: savingsProducts, savingsProduct, governanceProposals return data without Authorization header**
    - **Validates: Requirements 6.6, 6.7**
  - [ ]* 12.3 Write property test for playground environment gating (Property 1)
    - **Property 1: Playground accessible if and only if NODE_ENV === 'development'**
    - **Validates: Requirements 1.3, 1.4**

- [ ] 13. Validate REST backward compatibility
  - [ ] 13.1 Verify all existing REST controller tests still pass without modification; confirm Swagger at `/api` remains accessible
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - [ ]* 13.2 Write property test for REST API unaffected by GraphQL errors (Property 10)
    - **Property 10: REST endpoints respond correctly regardless of GraphQL error state**
    - **Validates: Requirements 7.1, 7.2, 7.4**
  - [ ]* 13.3 Write property test for nested relation resolution (Property 3)
    - **Property 3: UserSubscription.product is a resolved SavingsProduct object, not a raw UUID**
    - **Validates: Requirements 2.3**

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Resolvers are thin delegation layers — all business logic stays in existing services
- `DataLoaderFactory` must be provided in `AppModule` (or a shared `CommonModule`) so it can be injected into the `GraphQLModule` context factory
- `schema.gql` is auto-generated on startup; commit it to source control for schema diffing
