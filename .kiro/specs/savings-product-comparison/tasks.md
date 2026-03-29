# Implementation Plan: Savings Product Comparison API

## Overview

Implement the `POST /savings/compare` endpoint within the existing `SavingsModule`. Work proceeds in layers: DTOs and entity first, then the core `ComparisonService`, then PDF export, and finally controller wiring and module registration.

## Tasks

- [ ] 1. Create request and response DTOs
  - [ ] 1.1 Create `dto/compare-products.dto.ts` with `UserGoalsDto` and `CompareProductsDto`
    - Apply `@ArrayMinSize(2)`, `@ArrayMaxSize(5)`, `@IsUUID()` on `productIds`
    - Apply `@Min(0)` on `principalAmount` and `monthlyContribution`
    - Apply `@IsEnum` on `optimizeFor` and `riskTolerance`
    - _Requirements: 1.2, 1.3, 1.4, 3.1, 4.1, 7.1_
  - [ ]* 1.2 Write property test for DTO array-size enforcement (Property 1)
    - **Property 1: Product ID array size is enforced**
    - Generate arrays of length 0–10 via `fast-check`; assert `class-validator` accepts iff 2 ≤ length ≤ 5
    - Tag: `// Feature: savings-product-comparison, Property 1: array size enforcement`
    - **Validates: Requirements 1.2, 1.3, 1.4**
  - [ ] 1.3 Create `dto/comparison-result.dto.ts` with `HistoricalDataPointDto`, `ProjectionDto`, `ProductComparisonEntryDto`, and `ComparisonResultDto`
    - _Requirements: 2.2, 3.4, 4.6, 5.1, 6.4_

- [ ] 2. Create `ProductHistory` entity and repository
  - [ ] 2.1 Create `entities/product-history.entity.ts`
    - Define `product_history` table with columns: `id`, `productId`, `month` (varchar 7), `interestRate`, `apy`, `createdAt`
    - Add `@ManyToOne(() => SavingsProduct)` relation with `@JoinColumn({ name: 'productId' })`
    - Add unique index on `(productId, month)`
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 2.2 Write property test for historical performance shape and ordering (Property 13)
    - **Property 13: Historical performance shape and ordering**
    - Generate arbitrary arrays of `ProductHistory` rows; assert mapped DTO has length ≤ 12, all fields present, dates ascending
    - Tag: `// Feature: savings-product-comparison, Property 13: history shape and order`
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [ ] 3. Implement `ComparisonService` — data fetching and APY
  - [ ] 3.1 Create `services/comparison.service.ts` with constructor injecting `SavingsProductRepository`, `ProductHistoryRepository`, `BlockchainSavingsService`, `PredictiveEvaluatorService`, and `CACHE_MANAGER`
    - Implement private `calculateApy(interestRate: number): number` using `(1 + r/100/12)^12 - 1`
    - _Requirements: 2.3_
  - [ ]* 3.2 Write property test for APY formula (Property 4)
    - **Property 4: APY formula is correct**
    - Generate `interestRate` ∈ [0, 100] via `fast-check`; assert computed APY matches formula within floating-point tolerance
    - Tag: `// Feature: savings-product-comparison, Property 4: APY formula`
    - **Validates: Requirements 2.3**
  - [ ] 3.3 Implement product lookup with 404 guard
    - Fetch active products by IDs; throw `NotFoundException` for any missing or inactive ID
    - _Requirements: 1.5_
  - [ ]* 3.4 Write property test for unknown product IDs producing 404 (Property 2)
    - **Property 2: Unknown product IDs produce 404**
    - Generate requests with at least one non-existent UUID; assert service throws `NotFoundException`
    - Tag: `// Feature: savings-product-comparison, Property 2: unknown product 404`
    - **Validates: Requirements 1.5**
  - [ ] 3.5 Implement TVL enrichment with blockchain fallback
    - For each product with a `contractId`, call `BlockchainSavingsService.getVaultTotalAssets`; on error fall back to entity `tvlAmount` and set `liveDataUnavailable: true`
    - _Requirements: 2.4, 2.5_
  - [ ]* 3.6 Write property test for blockchain fallback flag (Property 5)
    - **Property 5: Blockchain fallback sets liveDataUnavailable flag**
    - For any product with `contractId`, mock service to throw; assert `liveDataUnavailable: true` and `tvlAmount` equals entity value
    - Tag: `// Feature: savings-product-comparison, Property 5: blockchain fallback`
    - **Validates: Requirements 2.5**
  - [ ] 3.7 Implement historical performance fetch with per-product Redis cache (TTL 3600 s)
    - Key format: `product_history:{productId}`; return up to 12 months ordered by `month` ascending
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4. Implement `ComparisonService` — projections and scoring
  - [ ] 4.1 Implement projected earnings calculation
    - When `principalAmount` is present, call `PredictiveEvaluatorService.calculateProjectedBalance` per product
    - Apply `belowMinimum` substitution when `principalAmount` < `product.minAmount`
    - Set `projectionsUnavailable: true` at response root when `principalAmount` is absent
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 4.2 Write property test for projections absent when principalAmount omitted (Property 6)
    - **Property 6: Projections absent when principalAmount is omitted**
    - Generate requests without `principalAmount`; assert `projectionsUnavailable: true` and no `projection` on any entry
    - Tag: `// Feature: savings-product-comparison, Property 6: projections absent`
    - **Validates: Requirements 3.5**
  - [ ]* 4.3 Write property test for monthly contribution monotonicity (Property 7)
    - **Property 7: Monthly contribution monotonically increases projected balance**
    - Generate `principalAmount` ≥ 0 and positive `monthlyContribution`; assert `projectedBalance(with) >= projectedBalance(without)`
    - Tag: `// Feature: savings-product-comparison, Property 7: contribution monotonicity`
    - **Validates: Requirements 3.3**
  - [ ]* 4.4 Write property test for belowMinimum substitution (Property 8)
    - **Property 8: belowMinimum flag and minAmount substitution**
    - Generate `principalAmount` < `product.minAmount`; assert `belowMinimum: true` and `projectedBalance` equals value computed with `minAmount`
    - Tag: `// Feature: savings-product-comparison, Property 8: belowMinimum substitution`
    - **Validates: Requirements 3.6**
  - [ ] 4.5 Implement best-option scoring for all three `optimizeFor` modes
    - Map `riskLevel` to `{ LOW: 0, MEDIUM: 1, HIGH: 2 }` for risk sort; treat `null` tenureMonths as `Infinity`
    - Default to `"return"` when `userGoals` is absent
    - Populate `bestProductId` and `recommendationReason`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ]* 4.6 Write property test for return ranking (Property 9)
    - **Property 9: Return ranking selects highest projected balance (or APY)**
    - Generate products with distinct APYs; assert `bestProductId` is the highest APY/balance product
    - Tag: `// Feature: savings-product-comparison, Property 9: return ranking`
    - **Validates: Requirements 4.2, 4.5**
  - [ ]* 4.7 Write property test for risk ranking (Property 10)
    - **Property 10: Risk ranking selects lowest risk level**
    - Generate products with distinct risk levels; assert `bestProductId` is the lowest-risk product
    - Tag: `// Feature: savings-product-comparison, Property 10: risk ranking`
    - **Validates: Requirements 4.3**
  - [ ]* 4.8 Write property test for tenure ranking (Property 11)
    - **Property 11: Tenure ranking selects shortest tenure**
    - Generate products with distinct `tenureMonths`; assert `bestProductId` is the shortest-tenure product
    - Tag: `// Feature: savings-product-comparison, Property 11: tenure ranking`
    - **Validates: Requirements 4.4**
  - [ ]* 4.9 Write property test for recommendation fields always present (Property 12)
    - **Property 12: Recommendation fields are always present**
    - For any valid comparison result, assert `bestProductId` is a non-empty string in the requested IDs and `recommendationReason` is non-empty
    - Tag: `// Feature: savings-product-comparison, Property 12: recommendation fields`
    - **Validates: Requirements 4.6**

- [ ] 5. Implement `ComparisonService` — caching and response assembly
  - [ ] 5.1 Implement full comparison result caching (TTL 300 s)
    - Build cache key from `JSON.stringify({ ids: sorted(productIds), principal, monthly, goals })` base64-encoded
    - Return cached result on hit; set cache on miss; wrap all cache operations in try/catch
    - Populate `cachedAt` as ISO 8601 timestamp on cache write; preserve it on cache hit
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 5.2 Write property test for cache round-trip (Property 14)
    - **Property 14: Caching round-trip — identical requests share cachedAt**
    - Make two identical calls within TTL window; assert second response has same `cachedAt` as first
    - Tag: `// Feature: savings-product-comparison, Property 14: cache round-trip`
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  - [ ]* 5.3 Write property test for response cardinality (Property 3)
    - **Property 3: Response contains exactly one entry per requested product**
    - Generate N ∈ [2, 5] valid product IDs; assert `products.length === N` and each `id` matches a requested ID
    - Tag: `// Feature: savings-product-comparison, Property 3: response cardinality`
    - **Validates: Requirements 2.1, 2.2**

- [ ] 6. Checkpoint — Ensure all ComparisonService tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement `ComparisonPdfService`
  - [ ] 7.1 Create `services/comparison-pdf.service.ts` using `pdfkit`
    - Accept `ComparisonResultDto`, return `Promise<Buffer>`
    - Sections: header with timestamp, product metrics table, projections table (if available), historical summary (last 3 points per product), best-option callout
    - Let `pdfkit` errors propagate; do not swallow exceptions
    - _Requirements: 7.2, 7.5_
  - [ ]* 7.2 Write unit test for PDF service output
    - Assert returned value is a non-empty `Buffer` for a valid `ComparisonResultDto`
    - _Requirements: 7.2_

- [ ] 8. Wire controller and module
  - [ ] 8.1 Add `POST /savings/compare` to `savings.controller.ts`
    - Apply `@UseGuards(JwtAuthGuard)`, `@HttpCode(HttpStatus.OK)`, and full Swagger decorators
    - When `exportPdf: true`: call `ComparisonPdfService.generate(result)`, set `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="savings-comparison-{timestamp}.pdf"`, catch errors and return HTTP 500
    - When `exportPdf: false` or omitted: return JSON result
    - _Requirements: 1.1, 1.6, 7.1, 7.3, 7.4, 7.5_
  - [ ] 8.2 Update `savings.module.ts`
    - Add `TypeOrmModule.forFeature([ProductHistory])` to imports
    - Add `ComparisonService` and `ComparisonPdfService` to providers
    - _Requirements: 1.1_
  - [ ]* 8.3 Write integration tests for the endpoint
    - `POST /savings/compare` without JWT → 401
    - `POST /savings/compare` with `exportPdf: true` → `Content-Type: application/pdf`, `Content-Disposition` header present
    - `POST /savings/compare` with `exportPdf: false` → `Content-Type: application/json`
    - PDF generation failure → 500, no partial body
    - _Requirements: 1.1, 7.3, 7.4, 7.5_

- [ ] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- All 14 correctness properties from the design are covered by property-based tests using `fast-check`
- Redis unavailability is handled gracefully — cache operations are wrapped in try/catch and the comparison proceeds without caching
