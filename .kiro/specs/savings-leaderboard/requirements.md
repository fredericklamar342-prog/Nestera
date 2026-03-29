# Requirements Document

## Introduction

This feature introduces a Savings Leaderboard system for the platform. It ranks users by savings-related metrics to gamify the experience and drive engagement. The leaderboard is exposed via a dedicated `LeaderboardModule` with a REST API, supports multiple ranking types, privacy opt-out, anonymized display names, weekly and all-time timeframes, Redis caching, pagination, and a badge/reward marker system for top savers.

## Glossary

- **Leaderboard**: A ranked list of users ordered by a specific savings metric.
- **LeaderboardModule**: The NestJS module that owns all leaderboard functionality.
- **LeaderboardEntry**: A single row in the leaderboard representing one user's rank and score.
- **RankingType**: The metric used to rank users — one of `total_savings`, `interest_earned`, or `savings_streak`.
- **Timeframe**: The period over which rankings are computed — either `weekly` or `all_time`.
- **SavingsStreak**: The number of consecutive weeks a user has made at least one active savings subscription contribution.
- **PrivacySettings**: A per-user record indicating whether the user has opted out of appearing on the leaderboard.
- **AnonymizedUsername**: A display name derived from the user's real name or ID, formatted as `"User****{last4}"` where `{last4}` is the last 4 characters of the user's public key or ID.
- **Badge**: A non-financial reward marker stored in the database and awarded to top-ranked users.
- **BadgeType**: The category of badge — one of `gold_saver`, `silver_saver`, `bronze_saver`.
- **Cache**: Redis-backed response cache managed via `CACHE_MANAGER` from `@nestjs/cache-manager`.
- **CurrentUser**: The authenticated user extracted from the JWT via the `CurrentUser` decorator.
- **JwtAuthGuard**: The NestJS guard that enforces JWT authentication on protected endpoints.
- **RolesGuard**: The NestJS guard that enforces role-based access control.
- **UserSubscription**: The entity tracking a user's savings product subscription, including `totalInterestEarned` and `status`.
- **SavingsGoal**: The entity tracking a user's savings goal progress.

---

## Requirements

### Requirement 1: Retrieve Leaderboard Rankings

**User Story:** As a user, I want to view a ranked leaderboard of savers, so that I can see how I compare to others and stay motivated.

#### Acceptance Criteria

1. WHEN a request is made to `GET /leaderboard`, THE LeaderboardModule SHALL return a paginated list of LeaderboardEntry records ranked in descending order by the requested RankingType.
2. WHEN the `rankingType` query parameter is `total_savings`, THE LeaderboardModule SHALL rank users by the sum of all active UserSubscription amounts for each user.
3. WHEN the `rankingType` query parameter is `interest_earned`, THE LeaderboardModule SHALL rank users by the sum of `totalInterestEarned` across all UserSubscriptions for each user.
4. WHEN the `rankingType` query parameter is `savings_streak`, THE LeaderboardModule SHALL rank users by their SavingsStreak count in descending order.
5. WHEN the `rankingType` query parameter is omitted, THE LeaderboardModule SHALL default to `total_savings` as the RankingType.
6. IF the `rankingType` query parameter contains a value other than `total_savings`, `interest_earned`, or `savings_streak`, THEN THE LeaderboardModule SHALL return an HTTP 400 response with a descriptive validation error message.

---

### Requirement 2: Timeframe Filtering

**User Story:** As a user, I want to filter the leaderboard by weekly or all-time periods, so that I can see both recent and long-term top savers.

#### Acceptance Criteria

1. WHEN the `timeframe` query parameter is `all_time`, THE LeaderboardModule SHALL compute rankings using all historical UserSubscription data for each user.
2. WHEN the `timeframe` query parameter is `weekly`, THE LeaderboardModule SHALL compute rankings using only UserSubscription data where `startDate` falls within the current calendar week (Monday 00:00 UTC to Sunday 23:59 UTC).
3. WHEN the `timeframe` query parameter is omitted, THE LeaderboardModule SHALL default to `all_time` as the Timeframe.
4. IF the `timeframe` query parameter contains a value other than `weekly` or `all_time`, THEN THE LeaderboardModule SHALL return an HTTP 400 response with a descriptive validation error message.

---

### Requirement 3: Privacy Opt-Out

**User Story:** As a user, I want to opt out of the leaderboard, so that my savings activity is not visible to other users.

#### Acceptance Criteria

1. THE LeaderboardModule SHALL maintain a PrivacySettings record per user that stores the user's leaderboard opt-out preference.
2. WHEN a user submits `PATCH /leaderboard/privacy` with `{ "optOut": true }`, THE LeaderboardModule SHALL set the user's PrivacySettings opt-out flag to `true` and return an HTTP 200 response confirming the update.
3. WHEN a user submits `PATCH /leaderboard/privacy` with `{ "optOut": false }`, THE LeaderboardModule SHALL set the user's PrivacySettings opt-out flag to `false` and return an HTTP 200 response confirming the update.
4. WHILE a user's PrivacySettings opt-out flag is `true`, THE LeaderboardModule SHALL exclude that user from all leaderboard query results.
5. THE `PATCH /leaderboard/privacy` endpoint SHALL require a valid JWT via JwtAuthGuard and apply the update to the CurrentUser.

---

### Requirement 4: Anonymized Display Names

**User Story:** As a user, I want my real name hidden on the leaderboard, so that I can participate without exposing my identity.

#### Acceptance Criteria

1. THE LeaderboardModule SHALL display each user in leaderboard results using an AnonymizedUsername instead of the user's real name or email.
2. THE LeaderboardModule SHALL derive the AnonymizedUsername by taking the last 4 characters of the user's `publicKey` field and formatting the result as `"User****{last4}"`.
3. IF a user's `publicKey` field is null or fewer than 4 characters, THEN THE LeaderboardModule SHALL derive the last 4 characters from the string representation of the user's `id` field instead.
4. THE LeaderboardModule SHALL never include the user's `email`, `name`, or `walletAddress` fields in any leaderboard API response.

---

### Requirement 5: Pagination

**User Story:** As a user, I want to page through leaderboard results, so that I can navigate large lists without loading all entries at once.

#### Acceptance Criteria

1. THE `GET /leaderboard` endpoint SHALL accept `page` and `pageSize` as query parameters.
2. WHEN `page` is omitted, THE LeaderboardModule SHALL default to page `1`.
3. WHEN `pageSize` is omitted, THE LeaderboardModule SHALL default to `20` entries per page.
4. IF `pageSize` exceeds `100`, THEN THE LeaderboardModule SHALL return an HTTP 400 response with a descriptive validation error.
5. IF `page` is less than `1` or `pageSize` is less than `1`, THEN THE LeaderboardModule SHALL return an HTTP 400 response with a descriptive validation error.
6. THE LeaderboardModule SHALL include `total`, `page`, `pageSize`, and `totalPages` fields in every paginated leaderboard response.

---

### Requirement 6: Redis Caching

**User Story:** As a platform operator, I want leaderboard responses cached in Redis, so that repeated queries do not overload the database.

#### Acceptance Criteria

1. WHEN `GET /leaderboard` is called, THE LeaderboardModule SHALL check the Cache for a stored response keyed by the combination of `rankingType`, `timeframe`, `page`, and `pageSize` before querying the database.
2. WHEN a Cache hit occurs, THE LeaderboardModule SHALL return the cached response without executing a database query.
3. WHEN a Cache miss occurs, THE LeaderboardModule SHALL execute the database query, store the result in the Cache with a TTL of 5 minutes, and return the result.
4. WHEN a user updates their PrivacySettings via `PATCH /leaderboard/privacy`, THE LeaderboardModule SHALL invalidate all Cache entries for the leaderboard.

---

### Requirement 7: Badges and Reward Markers for Top Savers

**User Story:** As a user, I want to earn badges for ranking in the top positions, so that my savings achievements are recognized on the platform.

#### Acceptance Criteria

1. THE LeaderboardModule SHALL store Badge records in the database with fields: `id`, `userId`, `badgeType`, `rankingType`, `timeframe`, and `awardedAt`.
2. WHEN the leaderboard is computed and the rank-1 user has changed since the last computation, THE LeaderboardModule SHALL award a `gold_saver` Badge to the new rank-1 user for the given RankingType and Timeframe.
3. WHEN the leaderboard is computed and the rank-2 user has changed since the last computation, THE LeaderboardModule SHALL award a `silver_saver` Badge to the new rank-2 user for the given RankingType and Timeframe.
4. WHEN the leaderboard is computed and the rank-3 user has changed since the last computation, THE LeaderboardModule SHALL award a `bronze_saver` Badge to the new rank-3 user for the given RankingType and Timeframe.
5. THE LeaderboardModule SHALL include a `badges` array field in each LeaderboardEntry response, listing all Badge records earned by that user.
6. THE `GET /leaderboard/badges/me` endpoint SHALL require a valid JWT via JwtAuthGuard and return all Badge records belonging to the CurrentUser.

---

### Requirement 8: Admin Leaderboard Management

**User Story:** As an admin, I want to manually trigger leaderboard recomputation and badge assignment, so that I can refresh rankings outside of the scheduled cycle.

#### Acceptance Criteria

1. THE `POST /leaderboard/recompute` endpoint SHALL require a valid JWT via JwtAuthGuard and restrict access to users with the `ADMIN` role via RolesGuard.
2. WHEN an admin calls `POST /leaderboard/recompute`, THE LeaderboardModule SHALL recompute rankings for all RankingType and Timeframe combinations, update Badge assignments, and invalidate the Cache.
3. WHEN `POST /leaderboard/recompute` completes successfully, THE LeaderboardModule SHALL return an HTTP 200 response with a confirmation message and the timestamp of the recomputation.

---

### Requirement 9: Savings Streak Computation

**User Story:** As a user, I want my savings streak tracked automatically, so that consistent saving behavior is rewarded on the leaderboard.

#### Acceptance Criteria

1. THE LeaderboardModule SHALL compute a user's SavingsStreak as the number of consecutive calendar weeks, ending with the current week, in which the user had at least one UserSubscription with `status` equal to `active`.
2. WHEN a user has no active UserSubscription in the current calendar week, THE LeaderboardModule SHALL set that user's SavingsStreak to `0`.
3. THE LeaderboardModule SHALL store the computed SavingsStreak value per user in the database and update it on each leaderboard recomputation.
