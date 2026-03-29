# Requirements Document

## Introduction

This feature adds a GraphQL API layer alongside the existing REST API in the NestJS backend. The goal is to give frontend developers more flexibility in data fetching, reduce over-fetching and under-fetching, and expose all existing domain entities (Users, SavingsProducts, UserSubscriptions, SavingsGoals, Notifications, Transactions, Claims, Disputes, Governance) through a unified GraphQL schema. The REST API must remain fully functional throughout.

## Glossary

- **GraphQL_Server**: The NestJS GraphQL module instance powered by `@nestjs/graphql` and Apollo Server
- **Resolver**: A NestJS class that handles GraphQL queries and mutations for a specific domain entity
- **Schema**: The GraphQL type definitions describing all queryable and mutable data shapes
- **DataLoader**: A batching and caching utility that solves the N+1 query problem by grouping database calls within a single request
- **GraphQL_Context**: The per-request object injected into every resolver, containing the authenticated user and DataLoader instances
- **JwtAuthGuard**: The existing Passport-based guard that validates JWT bearer tokens
- **Playground**: The interactive in-browser GraphQL IDE (Apollo Sandbox or GraphQL Playground) used during development
- **REST_API**: The existing set of HTTP endpoints that must remain unchanged
- **ConfigService**: The globally available NestJS service used to read environment variables
- **CACHE_MANAGER**: The Redis-backed cache manager already wired into the application

## Requirements

### Requirement 1: Install and Configure GraphQL Server

**User Story:** As a backend developer, I want to install and configure `@nestjs/graphql` with Apollo Server, so that the application can serve a GraphQL endpoint alongside the existing REST API.

#### Acceptance Criteria

1. THE GraphQL_Server SHALL be registered in the root `AppModule` using `GraphQLModule.forRootAsync` with options supplied via `ConfigService`.
2. THE GraphQL_Server SHALL expose the GraphQL endpoint at `/graphql`.
3. WHEN `NODE_ENV` is `development`, THE GraphQL_Server SHALL enable the interactive Playground at `/graphql`.
4. WHEN `NODE_ENV` is not `development`, THE GraphQL_Server SHALL disable the Playground.
5. THE GraphQL_Server SHALL use the code-first approach, auto-generating the SDL schema from TypeScript decorators.
6. THE GraphQL_Server SHALL write the generated schema file to `src/schema.gql` on startup.

---

### Requirement 2: Define GraphQL Schemas for All Entities

**User Story:** As a frontend developer, I want GraphQL types defined for every domain entity, so that I can query structured data without relying solely on REST response shapes.

#### Acceptance Criteria

1. THE Schema SHALL include an `ObjectType` for each of the following entities: `User`, `SavingsProduct`, `UserSubscription`, `SavingsGoal`, `Notification`, `NotificationPreference`, `Transaction`, `Claim`, `Dispute`, and `GovernanceProposal`.
2. THE Schema SHALL expose only non-sensitive fields on the `User` type; password hashes and internal tokens SHALL be excluded.
3. WHEN a field references another entity, THE Schema SHALL use a nested `ObjectType` reference rather than a raw foreign-key scalar.
4. THE Schema SHALL include `InputType` definitions for every create and update mutation argument.
5. THE Schema SHALL include pagination types (`PaginatedResult<T>`) exposing `items`, `total`, `page`, and `pageSize` fields for all list queries.

---

### Requirement 3: Implement Resolvers for Queries

**User Story:** As a frontend developer, I want GraphQL queries for all entities, so that I can fetch exactly the data I need in a single request.

#### Acceptance Criteria

1. THE Resolver for `User` SHALL expose a `me` query returning the currently authenticated user.
2. THE Resolver for `SavingsProduct` SHALL expose a `savingsProducts` query accepting optional `page` and `pageSize` arguments and returning a paginated list.
3. THE Resolver for `SavingsProduct` SHALL expose a `savingsProduct(id: ID!)` query returning a single product or `null`.
4. THE Resolver for `UserSubscription` SHALL expose a `mySubscriptions` query returning all subscriptions belonging to the authenticated user.
5. THE Resolver for `SavingsGoal` SHALL expose a `myGoals` query returning all goals belonging to the authenticated user.
6. THE Resolver for `Notification` SHALL expose a `myNotifications` query accepting optional `page` and `pageSize` arguments and returning a paginated list for the authenticated user.
7. THE Resolver for `Transaction` SHALL expose a `myTransactions` query accepting optional `page` and `pageSize` arguments and returning a paginated list for the authenticated user.
8. THE Resolver for `Claim` SHALL expose a `myClaims` query returning all claims belonging to the authenticated user.
9. THE Resolver for `Dispute` SHALL expose a `myDisputes` query returning all disputes belonging to the authenticated user.
10. THE Resolver for `GovernanceProposal` SHALL expose a `governanceProposals` query returning a paginated list of proposals.

---

### Requirement 4: Implement Resolvers for Mutations

**User Story:** As a frontend developer, I want GraphQL mutations for create and update operations, so that I can modify data through the GraphQL API without switching to REST.

#### Acceptance Criteria

1. THE Resolver for `SavingsGoal` SHALL expose a `createSavingsGoal(input: CreateSavingsGoalInput!)` mutation returning the created `SavingsGoal`.
2. THE Resolver for `SavingsGoal` SHALL expose an `updateSavingsGoal(id: ID!, input: UpdateSavingsGoalInput!)` mutation returning the updated `SavingsGoal`.
3. THE Resolver for `Notification` SHALL expose a `markNotificationRead(id: ID!)` mutation returning the updated `Notification`.
4. THE Resolver for `NotificationPreference` SHALL expose an `updateNotificationPreferences(input: UpdateNotificationPreferenceInput!)` mutation returning the updated `NotificationPreference`.
5. THE Resolver for `Claim` SHALL expose a `createClaim(input: CreateClaimInput!)` mutation returning the created `Claim`.
6. THE Resolver for `Dispute` SHALL expose a `createDispute(input: CreateDisputeInput!)` mutation returning the created `Dispute`.
7. WHEN a mutation violates a business rule, THE Resolver SHALL throw a `UserInputError` with a descriptive message.
8. WHEN a mutation targets a resource not owned by the authenticated user, THE Resolver SHALL throw a `ForbiddenError`.

---

### Requirement 5: DataLoader for N+1 Query Optimization

**User Story:** As a backend developer, I want DataLoader instances wired into the GraphQL context, so that nested field resolution does not produce N+1 database queries.

#### Acceptance Criteria

1. THE GraphQL_Server SHALL instantiate a fresh set of DataLoader instances per request and attach them to the GraphQL_Context.
2. THE DataLoader for `User` SHALL batch individual user-by-ID lookups into a single `WHERE id IN (...)` query per request tick.
3. THE DataLoader for `SavingsProduct` SHALL batch individual product-by-ID lookups into a single query per request tick.
4. WHEN a resolver requires a related entity, THE Resolver SHALL use the appropriate DataLoader from the GraphQL_Context rather than calling the repository directly.
5. THE DataLoader instances SHALL NOT be shared across requests.

---

### Requirement 6: JWT Authentication in GraphQL Context

**User Story:** As a security-conscious developer, I want JWT authentication enforced on protected GraphQL operations, so that unauthenticated users cannot access private data.

#### Acceptance Criteria

1. THE GraphQL_Server SHALL extract the `Authorization` header from each incoming HTTP request and validate the JWT using the existing `JwtStrategy`.
2. WHEN a valid JWT is present, THE GraphQL_Context SHALL contain the authenticated `User` object for use by resolvers.
3. WHEN no JWT or an invalid JWT is provided on a protected operation, THE GraphQL_Server SHALL return an `UNAUTHENTICATED` error.
4. THE `JwtAuthGuard` SHALL be applicable to individual resolvers and resolver methods via the existing `@UseGuards` decorator.
5. THE `me`, `mySubscriptions`, `myGoals`, `myNotifications`, `myTransactions`, `myClaims`, and `myDisputes` queries SHALL require a valid JWT.
6. THE `savingsProducts` and `savingsProduct` queries SHALL be publicly accessible without a JWT.
7. THE `governanceProposals` query SHALL be publicly accessible without a JWT.

---

### Requirement 7: Maintain REST API Backward Compatibility

**User Story:** As an existing API consumer, I want all current REST endpoints to remain unchanged, so that my integrations are not broken by the addition of GraphQL.

#### Acceptance Criteria

1. THE REST_API SHALL continue to serve all existing endpoints at their current paths and HTTP methods after GraphQL is introduced.
2. THE REST_API SHALL return the same response shapes and HTTP status codes as before the GraphQL integration.
3. THE GraphQL_Server SHALL reuse the existing service layer (e.g., `SavingsService`, `UserService`) rather than duplicating business logic.
4. WHEN the GraphQL endpoint is unavailable or returns an error, THE REST_API SHALL remain unaffected.
5. THE Swagger/OpenAPI documentation SHALL remain accessible and accurate after the GraphQL integration.
