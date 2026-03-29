# Requirements Document

## Introduction

This feature adds a Savings Product Comparison API to the existing NestJS savings module. It exposes a `POST /savings/compare` endpoint that accepts multiple savings product IDs and returns a side-by-side comparison including APY, tenure, risk level, projected earnings, historical performance, and a best-option recommendation based on the user's financial goals. The feature also supports exporting the comparison result as a PDF.

## Glossary

- **Comparison_API**: The `POST /savings/compare` endpoint responsible for orchestrating and returning comparison data.
- **SavingsProduct**: An existing entity with fields: id, name, type, description, interestRate, minAmount, maxAmount, tenureMonths, contractId, tvlAmount, isActive, riskLevel.
- **APY**: Annual Percentage Yield — the effective annual return rate accounting for compounding.
- **Projected_Earnings**: The estimated balance or interest earned over a product's tenure, calculated using compound interest logic from PredictiveEvaluatorService.
- **Historical_Performance**: Time-series data representing past interest rate or yield values for a savings product.
- **Best_Option**: The savings product ranked highest according to a scoring model derived from the user's stated goals (e.g., maximize return, minimize risk, shortest tenure).
- **User_Goals**: A set of optional parameters supplied by the caller to influence the best-option recommendation (e.g., targetAmount, preferredTenureMonths, riskTolerance).
- **PDF_Export**: A downloadable PDF document containing the full comparison result.
- **PredictiveEvaluatorService**: Existing service providing `calculateProjectedBalance` and `calculateRequiredMonthlyContribution`.
- **BlockchainSavingsService**: Existing service providing live on-chain TVL data via `getVaultTotalAssets`.
- **Cache**: Redis-backed cache via `CACHE_MANAGER` used to store comparison results and historical data.
- **ComparisonResult**: The structured response object returned by the Comparison_API.

---

## Requirements

### Requirement 1: Accept and Validate Comparison Request

**User Story:** As an authenticated user, I want to submit a list of savings product IDs for comparison, so that I can receive a structured side-by-side analysis.

#### Acceptance Criteria

1. THE Comparison_API SHALL require a valid JWT token on the `POST /savings/compare` endpoint, enforced by JwtAuthGuard.
2. THE Comparison_API SHALL accept a request body containing an array of between 2 and 5 savings product IDs.
3. IF the request body contains fewer than 2 product IDs, THEN THE Comparison_API SHALL return HTTP 400 with a descriptive validation error.
4. IF the request body contains more than 5 product IDs, THEN THE Comparison_API SHALL return HTTP 400 with a descriptive validation error.
5. IF any supplied product ID does not correspond to an active SavingsProduct record, THEN THE Comparison_API SHALL return HTTP 404 identifying the missing product ID.
6. THE Comparison_API SHALL be documented with Swagger/OpenAPI annotations including request body schema, response schema, and possible error codes.

---

### Requirement 2: Side-by-Side Product Metrics

**User Story:** As an authenticated user, I want to see APY, tenure, and risk level for each product in a single response, so that I can evaluate them without making multiple requests.

#### Acceptance Criteria

1. WHEN a valid comparison request is received, THE Comparison_API SHALL return a ComparisonResult containing one entry per requested SavingsProduct.
2. THE Comparison_API SHALL include the following fields for each product entry: id, name, type, interestRate, APY (derived from interestRate and tenureMonths), minAmount, maxAmount, tenureMonths, riskLevel, tvlAmount.
3. THE Comparison_API SHALL compute APY using the formula: `APY = (1 + interestRate / compoundingPeriods) ^ compoundingPeriods - 1` where compoundingPeriods defaults to 12 (monthly compounding).
4. WHEN live on-chain data is available, THE Comparison_API SHALL populate tvlAmount from BlockchainSavingsService for each product that has a contractId.
5. IF BlockchainSavingsService returns an error for a given product, THEN THE Comparison_API SHALL fall back to the tvlAmount stored in the SavingsProduct entity and include a `liveDataUnavailable: true` flag for that product entry.

---

### Requirement 3: Projected Earnings Calculator

**User Story:** As an authenticated user, I want to see projected earnings for each product given a principal amount and optional monthly contribution, so that I can estimate my returns before committing.

#### Acceptance Criteria

1. THE Comparison_API SHALL accept optional projection parameters in the request body: `principalAmount` (number, ≥ 0), `monthlyContribution` (number, ≥ 0).
2. WHEN `principalAmount` is provided, THE Comparison_API SHALL compute projected earnings for each product using PredictiveEvaluatorService.calculateProjectedBalance with the product's interestRate and tenureMonths.
3. WHEN `monthlyContribution` is provided alongside `principalAmount`, THE Comparison_API SHALL include the contribution in the projected balance calculation.
4. THE Comparison_API SHALL include the following projection fields per product entry: `projectedBalance`, `totalInterestEarned`, `effectiveTenureMonths`.
5. IF `principalAmount` is not provided, THEN THE Comparison_API SHALL omit projection fields from the response and include a `projectionsUnavailable: true` flag at the response root.
6. IF `principalAmount` is provided but is less than a product's minAmount, THEN THE Comparison_API SHALL include a `belowMinimum: true` flag on that product's projection entry and compute projections using the product's minAmount instead.

---

### Requirement 4: Best-Option Recommendation

**User Story:** As an authenticated user, I want the API to highlight the best savings product based on my goals, so that I can make an informed decision quickly.

#### Acceptance Criteria

1. THE Comparison_API SHALL accept an optional `userGoals` object in the request body with fields: `optimizeFor` (enum: `"return"` | `"risk"` | `"tenure"`), `targetAmount` (number), `riskTolerance` (enum: `"low"` | `"medium"` | `"high"`).
2. WHEN `userGoals.optimizeFor` is `"return"`, THE Comparison_API SHALL rank products by descending projected balance (or APY when projections are unavailable) and designate the top-ranked product as the best option.
3. WHEN `userGoals.optimizeFor` is `"risk"`, THE Comparison_API SHALL rank products by ascending riskLevel (low < medium < high) and designate the lowest-risk product as the best option.
4. WHEN `userGoals.optimizeFor` is `"tenure"`, THE Comparison_API SHALL rank products by ascending tenureMonths and designate the shortest-tenure product as the best option.
5. WHEN `userGoals` is not provided, THE Comparison_API SHALL default to `optimizeFor: "return"` for the best-option calculation.
6. THE Comparison_API SHALL include a `bestProductId` field and a `recommendationReason` string in the ComparisonResult explaining the selection criteria.

---

### Requirement 5: Historical Performance Data

**User Story:** As an authenticated user, I want to see historical performance data for each product, so that I can assess consistency and trend before investing.

#### Acceptance Criteria

1. THE Comparison_API SHALL include a `historicalPerformance` array per product entry, containing monthly data points with fields: `date` (ISO 8601 month string), `interestRate` (number), `apy` (number).
2. THE Comparison_API SHALL return up to 12 months of historical data per product.
3. WHEN historical data is available in the database for a product, THE Comparison_API SHALL return it ordered by date ascending.
4. IF fewer than 12 months of historical data exist for a product, THEN THE Comparison_API SHALL return only the available data points without padding.
5. WHILE historical data is being fetched, THE Comparison_API SHALL use a Redis cache with a TTL of 3600 seconds (1 hour) keyed by product ID to avoid redundant database queries.

---

### Requirement 6: Comparison Result Caching

**User Story:** As a platform operator, I want comparison results to be cached, so that repeated identical requests do not cause unnecessary database and blockchain load.

#### Acceptance Criteria

1. THE Comparison_API SHALL cache the full ComparisonResult in Redis using a cache key derived from the sorted product ID array, principalAmount, monthlyContribution, and userGoals.
2. THE Comparison_API SHALL set a TTL of 300 seconds (5 minutes) on cached ComparisonResult entries.
3. WHEN a cached ComparisonResult exists for an identical request, THE Comparison_API SHALL return the cached result without re-querying the database or BlockchainSavingsService.
4. THE Comparison_API SHALL include a `cachedAt` ISO 8601 timestamp in the response indicating when the result was generated or last refreshed.

---

### Requirement 7: PDF Export

**User Story:** As an authenticated user, I want to export the comparison as a PDF, so that I can share or archive the analysis offline.

#### Acceptance Criteria

1. THE Comparison_API SHALL accept an optional `exportPdf` boolean flag in the request body.
2. WHEN `exportPdf` is `true`, THE Comparison_API SHALL generate a PDF document containing all comparison data including product metrics, projections (if available), historical performance summary, and the best-option recommendation.
3. WHEN `exportPdf` is `true`, THE Comparison_API SHALL return the response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="savings-comparison-{timestamp}.pdf"`.
4. WHEN `exportPdf` is `false` or omitted, THE Comparison_API SHALL return the response as `application/json`.
5. IF PDF generation fails, THEN THE Comparison_API SHALL return HTTP 500 with a descriptive error message and SHALL NOT return a partial PDF.
