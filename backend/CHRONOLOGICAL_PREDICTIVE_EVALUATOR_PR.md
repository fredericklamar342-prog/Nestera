# [Backend] Chronological Predictive Evaluator

## Overview
Implements mathematical calculations for evaluating if users are on track to meet their savings goals by explicit deadlines based on current yields. The logic is abstracted into DTO payloads, keeping complex timing analysis away from frontend logic.

## Changes

### New Files
- `src/modules/savings/dto/goal-progress.dto.ts` - Enhanced DTO with predictive fields
- `src/modules/savings/services/predictive-evaluator.service.ts` - Core predictive evaluation logic
- `src/modules/savings/services/predictive-evaluator.service.spec.ts` - Comprehensive test suite (17 tests, all passing)

### Modified Files
- `src/modules/savings/savings.service.ts` - Integrated predictive evaluator into goal progress mapping
- `src/modules/savings/savings.module.ts` - Registered PredictiveEvaluatorService

## Key Features

### Predictive Evaluation
- **Compound Interest Calculation**: Projects balance at target date using monthly compounding formula
- **Off-Track Detection**: Explicit `isOffTrack` flag when projected balance < target amount
- **Projection Gap**: Calculates shortfall amount for user awareness
- **Yield Integration**: Uses average yield from active subscriptions for accurate projections

### DTO Enrichment
Goal progress responses now include:
- `projectedBalance` - Estimated balance at target date
- `isOffTrack` - Boolean flag for deadline warnings
- `projectionGap` - Gap between target and projected balance
- `appliedYieldRate` - Yield rate used for calculations

## Acceptance Criteria Met
✅ Mathematical calculations resolve logic directly into DTO payloads  
✅ Complex timing analysis abstracted from frontend  
✅ Explicit `isOffTrack` markers mapped within payload dynamically  
✅ Based on expected yield evaluating if projection < targetAmount  
✅ All tests passing (17/17)  
✅ Build successful

## Testing
- Unit tests cover all calculation methods
- Edge cases handled (past dates, zero yield, negative inputs)
- All 17 tests passing
