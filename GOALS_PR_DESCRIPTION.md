# Savings Goal Initialization - Enhanced Validation for POST /goals

## Overview

Enhanced the existing POST /goals endpoint with strict future date validation, ensuring users can only create savings goals with target dates that are genuinely in the future.

## Changes

### Enhanced Validation

- **Custom Validator**: Created `@IsFutureDate` decorator for reusable future date validation
- **DTO Layer**: Enhanced `CreateGoalDto` with strict validation rules
- **Service Layer**: Added server-side validation for defense-in-depth
- **ISO 8601 Support**: Seamless handling of ISO date strings and Date objects

### Validation Rules

- `goalName`: Required, non-empty, max 255 characters
- `targetAmount`: Minimum 0.01 XLM, must be a valid number
- `targetDate`: Must be strictly in the future (day-level comparison)
- `metadata`: Optional, must be a valid object if provided

### Request/Response Format

```json
// Request
POST /savings/goals
{
  "goalName": "Buy a Car",
  "targetAmount": 50000,
  "targetDate": "2027-12-31T00:00:00.000Z",
  "metadata": {
    "imageUrl": "https://cdn.nestera.io/goals/car.jpg",
    "iconRef": "car-icon",
    "color": "#4F46E5"
  }
}

// Response
{
  "id": "uuid",
  "userId": "uuid",
  "goalName": "Buy a Car",
  "targetAmount": 50000,
  "targetDate": "2027-12-31",
  "status": "IN_PROGRESS",
  "metadata": { ... },
  "createdAt": "2026-03-26T...",
  "updatedAt": "2026-03-26T..."
}
```

### Error Handling

```json
// Past date error
{
  "statusCode": 400,
  "message": "Target date must be in the future",
  "error": "Bad Request"
}

// Validation error
{
  "statusCode": 400,
  "message": [
    "Goal name is required",
    "Target amount must be at least 0.01 XLM",
    "Target date must be in the future"
  ],
  "error": "Bad Request"
}
```

## Technical Implementation

### Custom Validator

- `IsFutureDate` decorator in `backend/src/common/validators/`
- Day-level comparison (ignores time component)
- Reusable across the application

### DTO Enhancements

- `@IsNotEmpty` for required fields
- `@Transform` for ISO string to Date conversion
- `@IsFutureDate` for strict future date validation
- Improved error messages for all validators

### Service Layer

- Additional server-side validation
- Explicit status setting (`IN_PROGRESS`)
- Defense-in-depth validation strategy

### Testing

- ✅ 15 DTO validation test cases
- ✅ 5 service method test cases
- ✅ All existing tests passing (146 tests total)
- ✅ TypeScript compilation successful
- ✅ Build successful

## Files Changed

- `backend/src/common/validators/is-future-date.validator.ts` (new)
- `backend/src/modules/savings/dto/create-goal.dto.ts` (enhanced)
- `backend/src/modules/savings/dto/create-goal.dto.spec.ts` (new)
- `backend/src/modules/savings/savings.service.ts` (enhanced)
- `backend/src/modules/savings/savings.service.spec.ts` (enhanced)

## Acceptance Criteria Met

✅ Explicit DTO using class-validator  
✅ targetDate validates strictly as future date  
✅ Seamless ISO 8601 date string mapping  
✅ Execute save() generating active SavingsGoal entry  
✅ Uniquely mapped to user ID  
✅ Comprehensive validation tests  
✅ Server-side validation for defense-in-depth

## Example Usage

```bash
# Create a savings goal
curl -X POST http://localhost:3000/savings/goals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "goalName": "Emergency Fund",
    "targetAmount": 10000,
    "targetDate": "2027-12-31T00:00:00.000Z",
    "metadata": {
      "iconRef": "emergency-icon",
      "color": "#EF4444"
    }
  }'

# Error: Past date
curl -X POST http://localhost:3000/savings/goals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "goalName": "Past Goal",
    "targetAmount": 5000,
    "targetDate": "2020-01-01T00:00:00.000Z"
  }'
# Returns: 400 Bad Request - "Target date must be in the future"
```

## Notes

- The endpoint was already implemented; this PR enhances validation
- Date comparison is done at day-level (time component ignored)
- Both DTO and service layers validate for defense-in-depth
- Metadata field remains optional and flexible for frontend needs
