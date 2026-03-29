# Observability & Incident Tracing Runbook

This document explains how to use correlation IDs and audit logs to trace incidents across the Amana system.

## Overview

Every API request generates a unique correlation ID that flows through:
1. HTTP request headers
2. Database mutations (audit logs)
3. Background jobs and listeners
4. Smart contract events

This enables end-to-end tracing for debugging and forensic analysis.

## Correlation ID Format

- **Header**: `X-Correlation-ID`
- **Format**: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **Lifetime**: Entire request lifecycle from API → DB → contract

## Tracing a Request

### 1. Find the Correlation ID

From HTTP response headers:
```bash
curl -i https://api.amana.io/claims \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patientName": "John Doe", ...}'

# Response includes:
# X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

Or from error response:
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2. Query Audit Logs

Find all mutations for a request:

```sql
-- Find all audit entries for a correlation ID
SELECT 
  correlation_id,
  timestamp,
  action,
  actor,
  resource_type,
  resource_id,
  status_code,
  duration_ms,
  success,
  error_message
FROM audit_logs
WHERE correlation_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY timestamp ASC;
```

### 3. Trace Specific Resource

Find all mutations affecting a trade or dispute:

```sql
-- Find all changes to a specific claim
SELECT 
  correlation_id,
  timestamp,
  action,
  actor,
  status_code,
  duration_ms,
  error_message
FROM audit_logs
WHERE resource_id = 'claim-uuid-here'
  AND resource_type = 'CLAIM'
ORDER BY timestamp DESC;

-- Find all disputes for a claim
SELECT 
  correlation_id,
  timestamp,
  action,
  actor,
  status_code
FROM audit_logs
WHERE resource_id = 'claim-uuid-here'
  AND resource_type = 'DISPUTE'
ORDER BY timestamp DESC;
```

### 4. Find Actions by Actor

Identify all mutations by a specific user:

```sql
-- Find all actions by a user
SELECT 
  correlation_id,
  timestamp,
  action,
  resource_type,
  resource_id,
  status_code,
  success
FROM audit_logs
WHERE actor = 'user@example.com'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

### 5. Identify Failed Operations

Find errors and failures:

```sql
-- Find all failed mutations in last hour
SELECT 
  correlation_id,
  timestamp,
  action,
  actor,
  resource_type,
  status_code,
  error_message
FROM audit_logs
WHERE success = false
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- Find specific error patterns
SELECT 
  error_message,
  COUNT(*) as count,
  MAX(timestamp) as last_occurrence
FROM audit_logs
WHERE success = false
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY count DESC;
```

## Common Incident Scenarios

### Scenario 1: Claim Status Changed Unexpectedly

**Problem**: A claim status changed without authorization

**Investigation**:
```sql
-- Find who changed the claim and when
SELECT 
  correlation_id,
  timestamp,
  actor,
  action,
  status_code
FROM audit_logs
WHERE resource_id = 'claim-uuid'
  AND resource_type = 'CLAIM'
  AND action = 'UPDATE'
ORDER BY timestamp DESC
LIMIT 10;

-- Check if actor was authorized
SELECT * FROM users WHERE email = 'actor@example.com';

-- Verify the change in claims table
SELECT id, status, updated_at FROM medical_claims WHERE id = 'claim-uuid';
```

### Scenario 2: Dispute Not Resolving

**Problem**: A dispute is stuck in UNDER_REVIEW status

**Investigation**:
```sql
-- Find all mutations for the dispute
SELECT 
  correlation_id,
  timestamp,
  action,
  actor,
  status_code,
  error_message
FROM audit_logs
WHERE resource_id = 'dispute-uuid'
  AND resource_type = 'DISPUTE'
ORDER BY timestamp DESC;

-- Check current dispute state
SELECT id, status, created_at, updated_at FROM disputes WHERE id = 'dispute-uuid';

-- Find related claim
SELECT c.id, c.status FROM medical_claims c
WHERE c.id = (SELECT claim_id FROM disputes WHERE id = 'dispute-uuid');
```

### Scenario 3: Performance Degradation

**Problem**: API requests are slow

**Investigation**:
```sql
-- Find slow requests
SELECT 
  correlation_id,
  timestamp,
  endpoint,
  method,
  duration_ms,
  status_code
FROM audit_logs
WHERE duration_ms > 5000  -- Requests taking > 5 seconds
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY duration_ms DESC
LIMIT 20;

-- Identify slow endpoints
SELECT 
  endpoint,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as request_count
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY avg_duration DESC;
```

### Scenario 4: Unauthorized Access Attempt

**Problem**: Someone tried to access a resource they shouldn't

**Investigation**:
```sql
-- Find failed authorization attempts
SELECT 
  correlation_id,
  timestamp,
  actor,
  endpoint,
  status_code,
  error_message
FROM audit_logs
WHERE status_code IN (401, 403)  -- Unauthorized or Forbidden
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Check if actor has legitimate access
SELECT * FROM users WHERE email = 'actor@example.com';
```

## Logging Best Practices

### In Application Code

Always include correlation ID in logs:

```typescript
// Automatically included via CorrelationIdInterceptor
this.logger.log(`Processing claim ${claimId}`, 'ClaimsService');

// Logs will include correlation ID in structured format
// [550e8400-e29b-41d4-a716-446655440000] Processing claim abc-123
```

### In Background Jobs

Propagate correlation ID to async operations:

```typescript
// Pass correlation ID to background job
await this.queue.add('process-claim', {
  claimId,
  correlationId: request.correlationId,
});

// In job handler
async handle(job: Job) {
  const { claimId, correlationId } = job.data;
  this.logger.log(
    `[${correlationId}] Processing claim ${claimId}`,
    'ClaimProcessor'
  );
}
```

### In Contract Events

Include correlation ID in event metadata:

```typescript
// When emitting contract events
const event = {
  type: 'CLAIM_APPROVED',
  claimId,
  correlationId: request.correlationId,
  timestamp: new Date(),
};
```

## Querying Patterns

### Time-Range Queries

```sql
-- Last hour
WHERE timestamp > NOW() - INTERVAL '1 hour'

-- Last 24 hours
WHERE timestamp > NOW() - INTERVAL '24 hours'

-- Specific date range
WHERE timestamp BETWEEN '2024-01-01' AND '2024-01-31'
```

### Performance Analysis

```sql
-- Percentile response times
SELECT 
  endpoint,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY endpoint;
```

### Error Rate Analysis

```sql
-- Error rate by endpoint
SELECT 
  endpoint,
  COUNT(*) as total_requests,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_requests,
  ROUND(100.0 * SUM(CASE WHEN success = false THEN 1 ELSE 0 END) / COUNT(*), 2) as error_rate_percent
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY error_rate_percent DESC;
```

## Alerts & Monitoring

### Recommended Alerts

1. **High Error Rate**: Alert if error rate > 5% in 5-minute window
2. **Slow Requests**: Alert if p95 response time > 5 seconds
3. **Unauthorized Access**: Alert on multiple 401/403 errors from same actor
4. **Failed Disputes**: Alert if dispute resolution fails

### Example Alert Query

```sql
-- Alert: Multiple failed dispute resolutions
SELECT 
  actor,
  COUNT(*) as failure_count,
  MAX(timestamp) as last_failure
FROM audit_logs
WHERE resource_type = 'DISPUTE'
  AND action = 'UPDATE'
  AND success = false
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY actor
HAVING COUNT(*) > 3;
```

## Retention Policy

- **Audit Logs**: Retained for 90 days (configurable)
- **Application Logs**: Retained for 30 days
- **Contract Events**: Retained indefinitely (immutable on blockchain)

## Privacy Considerations

- Audit logs contain actor email/wallet addresses
- Restrict access to audit logs to authorized personnel
- Implement row-level security for sensitive data
- Comply with GDPR/privacy regulations for data retention

## Support

For questions about tracing or incident investigation:
1. Check this runbook
2. Review application logs
3. Query audit logs for correlation ID
4. Contact the observability team
