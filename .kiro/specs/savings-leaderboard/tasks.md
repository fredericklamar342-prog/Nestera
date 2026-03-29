# Implementation Plan: Savings Leaderboard API

## Overview

Implement the `LeaderboardModule` as a self-contained NestJS module at `backend/src/modules/leaderboard/`. Tasks follow the dependency order: entities → DTOs → service core → controller → scheduler → wiring → tests.

## Tasks

- [ ] 1. Create entities and enums
  - [ ] 1.1 Create enums and entity files
    - Create `backend/src/modules/leaderboard/entities/leaderboard-privacy-settings.entity.ts` with `LeaderboardPrivacySettings` entity (uuid PK, unique `userId`, `optOut` boolean, timestamps)
    - Create `backend/src/modules/leaderboard/entities/leaderboard-badge.entity.ts` with `LeaderboardBadge` entity and `BadgeType` enum (`gold_saver`, `silver_saver`, `bronze_saver`)
    - Create `backend/src/modules/leaderboard/entities/user-savings-streak.entity.ts` with `UserSavingsStreak` entity (uuid PK, unique `userId`, `streakWeeks` int)
    - Define `RankingType` (`total_savings`, `interest_earned`, `savings_streak`) and `Timeframe` (`all_time`, `weekly`) enums in a shared `leaderboard.enums.ts` file
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 7.1, 9.3_

  - [ ]* 1.2 Write unit tests for entity definitions
    - Verify column metadata and unique constraints are declared correctly
    - _Requirements: 3.1, 7.1, 9.3_

- [ ] 2. Create DTOs with validation
  - [ ] 2.1 Implement all DTO classes
    - Create `leaderboard-query.dto.ts`: `rankingType` (`@IsEnum(RankingType)`, default `total_savings`), `timeframe` (`@IsEnum(Timeframe)`, default `all_time`), `page` (`@Min(1)`, default `1`), `pageSize` (`@Min(1) @Max(100)`, default `20`)
    - Create `leaderboard-entry.dto.ts`: `rank`, `anonymizedUsername`, `score`, `badges: LeaderboardBadgeDto[]`
    - Create `paginated-leaderboard.dto.ts`: `data`, `total`, `page`, `pageSize`, `totalPages`
    - Create `update-privacy.dto.ts`: `optOut: boolean` with `@IsBoolean()`
    - Create `recompute-response.dto.ts`: `message: string`, `recomputedAt: string`
    - _Requirements: 1.5, 1.6, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 2.2 Write property test for DTO validation (Property 5)
    - **Property 5: Invalid query parameters return HTTP 400**
    - **Validates: Requirements 1.6, 2.4, 5.4, 5.5**
    - Use `fast-check` to generate strings outside valid enum sets, `pageSize > 100`, `page < 1`, `pageSize < 1`
    - Tag: `// Feature: savings-leaderboard, Property 5: Invalid query parameters return HTTP 400`

- [ ] 3. Implement `LeaderboardService` — core helpers
  - [ ] 3.1 Implement `anonymize` helper
    - Implement `anonymize(user: { publicKey?: string | null; id: string }): string`
    - Use `publicKey` last 4 chars if non-null and length ≥ 4; otherwise fall back to `id` last 4 chars
    - Return `"User****{last4}"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.2 Write property test for anonymization (Property 8)
    - **Property 8: Anonymization function correctness with fallback**
    - **Validates: Requirements 4.2, 4.3**
    - Use `fast-check` to generate users with random `publicKey` (null, length < 4, length ≥ 4) and `id`
    - Assert output equals `"User****" + correct last4`
    - Tag: `// Feature: savings-leaderboard, Property 8: Anonymization function correctness with fallback`

  - [ ] 3.3 Implement `buildRankingQuery` helper
    - Build TypeORM `SelectQueryBuilder` for each `RankingType`:
      - `total_savings`: JOIN `user_subscriptions` where `status = 'ACTIVE'`, `SUM(amount)` as score
      - `interest_earned`: same JOIN, `SUM(total_interest_earned)` as score
      - `savings_streak`: LEFT JOIN `user_savings_streaks`, `COALESCE(streak_weeks, 0)` as score
    - Apply weekly date filter (`startDate >= weekStart AND startDate <= weekEnd`) when `timeframe = weekly`
    - LEFT JOIN `leaderboard_privacy_settings` and filter `opt_out IS NULL OR opt_out = false`
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 3.4_

  - [ ]* 3.4 Write property test for weekly timeframe exclusion (Property 4)
    - **Property 4: Weekly timeframe excludes out-of-week subscriptions**
    - **Validates: Requirements 2.2**
    - Generate subscriptions with `startDate` inside and outside the current ISO week; assert out-of-week subscriptions contribute 0 to weekly score
    - Tag: `// Feature: savings-leaderboard, Property 4: Weekly timeframe excludes out-of-week subscriptions`

- [ ] 4. Implement `LeaderboardService` — streak and badge logic
  - [ ] 4.1 Implement `computeStreaks`
    - For each user, fetch distinct ISO weeks where they had at least one `ACTIVE` `UserSubscription`
    - Walk backwards from the current ISO week counting consecutive weeks; stop at first gap
    - Upsert result into `UserSavingsStreak`
    - Set streak to `0` if current week has no active subscription
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 4.2 Write property test for streak computation (Property 14)
    - **Property 14: Streak computation correctness**
    - **Validates: Requirements 9.1, 9.2**
    - Use `fast-check` to generate random sets of active ISO weeks per user; assert computed streak equals consecutive run ending current week (0 if current week absent)
    - Tag: `// Feature: savings-leaderboard, Property 14: Streak computation correctness`

  - [ ] 4.3 Implement `awardBadges`
    - For each `(rankingType, timeframe)` combination, compute full ranking (no pagination)
    - Extract top-3 users; map rank 1 → `gold_saver`, rank 2 → `silver_saver`, rank 3 → `bronze_saver`
    - For each rank position, query the most recent `LeaderboardBadge` for that `(badgeType, rankingType, timeframe)`
    - Insert a new `LeaderboardBadge` only when the current rank holder differs from the previous badge holder
    - Retain old badge records (historical); never delete existing badges
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ]* 4.4 Write property test for badge award on rank change (Property 13)
    - **Property 13: Badge awarded when rank holder changes**
    - **Validates: Requirements 7.2, 7.3, 7.4**
    - Simulate two recomputations with different rank-1/2/3 users; assert new badge record inserted for new holder; assert no new badge when holder is unchanged
    - Tag: `// Feature: savings-leaderboard, Property 13: Badge awarded when rank holder changes`

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement `LeaderboardService` — cache and public API methods
  - [ ] 6.1 Implement `invalidateLeaderboardCache`
    - Inject `CACHE_MANAGER`; call `cacheManager.store.keys('leaderboard:*')` to retrieve matching keys
    - Call `cacheManager.del(key)` for each matching key
    - Wrap in try/catch; log warning on failure without throwing
    - _Requirements: 6.4, 8.2_

  - [ ] 6.2 Implement `getLeaderboard`
    - Build cache key: `leaderboard:{rankingType}:{timeframe}:{page}:{pageSize}`
    - Check cache first; return cached `PaginatedLeaderboardDto` on hit
    - On miss: execute `buildRankingQuery`, fetch badges for top users, apply `anonymize`, build paginated response
    - Store result in cache with TTL 300 s; wrap cache read/write in try/catch (degrade gracefully)
    - Compute `totalPages = Math.ceil(total / pageSize)`
    - _Requirements: 1.1, 5.6, 6.1, 6.2, 6.3_

  - [ ]* 6.3 Write property test for descending order (Property 1)
    - **Property 1: Leaderboard entries are ordered descending by score**
    - **Validates: Requirements 1.1, 1.4**
    - Generate N users with random scores; seed DB; call `getLeaderboard`; assert `scores[i] >= scores[i+1]` for all i
    - Tag: `// Feature: savings-leaderboard, Property 1: Leaderboard entries are ordered descending by score`

  - [ ]* 6.4 Write property test for total_savings score (Property 2)
    - **Property 2: total_savings score equals sum of active subscription amounts**
    - **Validates: Requirements 1.2**
    - Generate users with random active subscription amounts; assert `entry.score === sum(amounts)`
    - Tag: `// Feature: savings-leaderboard, Property 2: total_savings score equals sum of active subscription amounts`

  - [ ]* 6.5 Write property test for interest_earned score (Property 3)
    - **Property 3: interest_earned score equals sum of totalInterestEarned**
    - **Validates: Requirements 1.3**
    - Generate users with random `totalInterestEarned` values; assert `entry.score === sum(totalInterestEarned)`
    - Tag: `// Feature: savings-leaderboard, Property 3: interest_earned score equals sum of totalInterestEarned`

  - [ ]* 6.6 Write property test for pagination metadata (Property 10)
    - **Property 10: Pagination metadata invariant**
    - **Validates: Requirements 5.6**
    - Generate N users, random `page`/`pageSize`; assert `totalPages = ceil(N/pageSize)`, `data.length <= pageSize`, `page = P`
    - Tag: `// Feature: savings-leaderboard, Property 10: Pagination metadata invariant`

  - [ ]* 6.7 Write property test for no PII in response (Property 9)
    - **Property 9: No PII fields in leaderboard response**
    - **Validates: Requirements 4.1, 4.4**
    - Assert no entry in `data` contains `email`, `name`, or `walletAddress` fields
    - Tag: `// Feature: savings-leaderboard, Property 9: No PII fields in leaderboard response`

  - [ ]* 6.8 Write property test for cache round-trip (Property 11)
    - **Property 11: Cache round-trip — identical requests share result within TTL**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Make two identical `GET /leaderboard` requests within TTL; assert responses are identical
    - Tag: `// Feature: savings-leaderboard, Property 11: Cache round-trip — identical requests share result within TTL`

- [ ] 7. Implement `updatePrivacy`, `getMyBadges`, and `recompute` service methods
  - [ ] 7.1 Implement `updatePrivacy`
    - Upsert `LeaderboardPrivacySettings` for `userId` with the given `optOut` value
    - Call `invalidateLeaderboardCache()` after upsert
    - Return `UpdatePrivacyResponseDto` with `optOut` and `updatedAt`
    - _Requirements: 3.1, 3.2, 3.3, 6.4_

  - [ ]* 7.2 Write property test for privacy toggle round-trip (Property 6)
    - **Property 6: Privacy opt-out toggle round-trip**
    - **Validates: Requirements 3.2, 3.3**
    - Generate random boolean sequences of `optOut` values; assert final stored value equals last submitted value
    - Tag: `// Feature: savings-leaderboard, Property 6: Privacy opt-out toggle round-trip`

  - [ ]* 7.3 Write property test for opted-out user exclusion (Property 7)
    - **Property 7: Opted-out users are excluded from all leaderboard results**
    - **Validates: Requirements 3.4**
    - Generate users, randomly mark some as opted-out; assert no opted-out user's `anonymizedUsername` appears in any page of results
    - Tag: `// Feature: savings-leaderboard, Property 7: Opted-out users are excluded from all leaderboard results`

  - [ ]* 7.4 Write property test for cache invalidation on privacy update (Property 12)
    - **Property 12: Privacy update invalidates leaderboard cache**
    - **Validates: Requirements 6.4**
    - Call `PATCH /leaderboard/privacy`; then `GET /leaderboard`; assert response reflects updated opt-out state
    - Tag: `// Feature: savings-leaderboard, Property 12: Privacy update invalidates leaderboard cache`

  - [ ] 7.5 Implement `getMyBadges`
    - Query `LeaderboardBadge` where `userId = currentUserId`
    - Return array of `LeaderboardBadgeDto`
    - _Requirements: 7.5, 7.6_

  - [ ] 7.6 Implement `recompute`
    - Call `computeStreaks()`, then `awardBadges()` for all `(rankingType, timeframe)` combinations, then `invalidateLeaderboardCache()`
    - Return `RecomputeResponseDto` with confirmation message and `recomputedAt` ISO timestamp
    - _Requirements: 8.2, 8.3_

- [ ] 8. Implement `LeaderboardController`
  - [ ] 8.1 Create controller with all four endpoints
    - `GET /leaderboard` — public, inject `LeaderboardQueryDto` via `@Query()`, call `getLeaderboard`
    - `PATCH /leaderboard/privacy` — `@UseGuards(JwtAuthGuard)`, extract `CurrentUser`, call `updatePrivacy`
    - `GET /leaderboard/badges/me` — `@UseGuards(JwtAuthGuard)`, extract `CurrentUser`, call `getMyBadges`
    - `POST /leaderboard/recompute` — `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('ADMIN')`, call `recompute`
    - _Requirements: 1.1, 3.5, 7.6, 8.1_

- [ ] 9. Implement `LeaderboardScheduler`
  - [ ] 9.1 Create scheduler class
    - Create `leaderboard.scheduler.ts` with `@Injectable()` class
    - Add `@Cron('5 0 * * 1')` method (Monday 00:05 UTC) that calls `leaderboardService.recompute()`
    - _Requirements: 9.1, 9.3_

- [ ] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Wire up `LeaderboardModule` and register in `AppModule`
  - [ ] 11.1 Create `leaderboard.module.ts`
    - Declare `LeaderboardController`, `LeaderboardService`, `LeaderboardScheduler`
    - Import `TypeOrmModule.forFeature([LeaderboardPrivacySettings, LeaderboardBadge, UserSavingsStreak])`
    - Import `CacheModule` (or rely on global cache registration) and `ScheduleModule` (already registered via `#473`)
    - Export `LeaderboardService`
    - _Requirements: all_

  - [ ] 11.2 Register `LeaderboardModule` in `app.module.ts`
    - Add `LeaderboardModule` to the `imports` array in `AppModule`
    - Do not add `ScheduleModule.forRoot()` — already added by issue #473
    - _Requirements: all_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Cache operations must be wrapped in try/catch to degrade gracefully when Redis is unavailable
- `ScheduleModule.forRoot()` must NOT be added again — it was registered by issue #473
