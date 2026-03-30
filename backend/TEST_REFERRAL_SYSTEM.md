# Manual Testing Guide for Referral System

## Prerequisites

1. Database is running and accessible
2. Backend server is running (`npm run start:dev`)
3. Migration has been executed (`npm run typeorm migration:run`)

## Test Scenario 1: Basic Referral Flow

### Step 1: Register User A (Referrer)
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usera@test.com",
    "password": "password123",
    "name": "User A"
  }'
```

**Expected Response:**
```json
{
  "user": { "id": "...", "email": "usera@test.com", ... },
  "accessToken": "eyJhbGc..."
}
```

**Save the accessToken as USER_A_TOKEN**

### Step 2: Generate Referral Code
```bash
curl -X POST http://localhost:3001/referrals/generate \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "referralCode": "ABC12345",
  "id": "uuid",
  "createdAt": "2026-03-29T..."
}
```

**Save the referralCode as REFERRAL_CODE**

### Step 3: Check Initial Stats
```bash
curl -X GET http://localhost:3001/referrals/stats \
  -H "Authorization: Bearer USER_A_TOKEN"
```

**Expected Response:**
```json
{
  "totalReferrals": 1,
  "pendingReferrals": 1,
  "completedReferrals": 0,
  "rewardedReferrals": 0,
  "totalRewardsEarned": "0.0000000",
  "referralCode": "ABC12345"
}
```

### Step 4: Register User B with Referral Code
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "userb@test.com",
    "password": "password123",
    "name": "User B",
    "referralCode": "ABC12345"
  }'
```

**Expected Response:**
```json
{
  "user": { "id": "...", "email": "userb@test.com", ... },
  "accessToken": "eyJhbGc..."
}
```

**Save the accessToken as USER_B_TOKEN**

### Step 5: Verify Referral Applied
```bash
curl -X GET http://localhost:3001/referrals/my-referrals \
  -H "Authorization: Bearer USER_A_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "referralCode": "ABC12345",
    "status": "pending",
    "rewardAmount": null,
    "refereeEmail": "userb@test.com",
    "createdAt": "2026-03-29T...",
    "completedAt": null,
    "rewardedAt": null
  }
]
```

### Step 6: Simulate First Deposit (Manual Trigger)
```bash
curl -X POST http://localhost:3001/referrals/check-completion \
  -H "Authorization: Bearer USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_B_ID",
    "depositAmount": "100"
  }'
```

**Expected Response:**
```json
{
  "message": "Referral check completed"
}
```

### Step 7: Verify Referral Completed
```bash
curl -X GET http://localhost:3001/referrals/my-referrals \
  -H "Authorization: Bearer USER_A_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "referralCode": "ABC12345",
    "status": "rewarded",
    "rewardAmount": "10.0000000",
    "refereeEmail": "userb@test.com",
    "createdAt": "2026-03-29T...",
    "completedAt": "2026-03-29T...",
    "rewardedAt": "2026-03-29T..."
  }
]
```

### Step 8: Check Updated Stats
```bash
curl -X GET http://localhost:3001/referrals/stats \
  -H "Authorization: Bearer USER_A_TOKEN"
```

**Expected Response:**
```json
{
  "totalReferrals": 1,
  "pendingReferrals": 0,
  "completedReferrals": 0,
  "rewardedReferrals": 1,
  "totalRewardsEarned": "10.0000000",
  "referralCode": "ABC12345"
}
```

## Test Scenario 2: Admin Campaign Management

### Step 1: Register Admin User
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "name": "Admin User"
  }'
```

**Note:** You may need to manually update the user's role to 'ADMIN' in the database:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';
```

**Save the accessToken as ADMIN_TOKEN**

### Step 2: Create Campaign
```bash
curl -X POST http://localhost:3001/admin/referrals/campaigns \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spring 2026 Campaign",
    "description": "Double rewards for spring!",
    "rewardAmount": 20,
    "refereeRewardAmount": 10,
    "minDepositAmount": 100,
    "maxRewardsPerUser": 10
  }'
```

**Expected Response:**
```json
{
  "id": "uuid",
  "name": "Spring 2026 Campaign",
  "description": "Double rewards for spring!",
  "rewardAmount": "20",
  "refereeRewardAmount": "10",
  "minDepositAmount": "100",
  "maxRewardsPerUser": 10,
  "isActive": true,
  "startDate": null,
  "endDate": null,
  "createdAt": "2026-03-29T...",
  "updatedAt": "2026-03-29T..."
}
```

**Save the campaign id as CAMPAIGN_ID**

### Step 3: List All Campaigns
```bash
curl -X GET http://localhost:3001/admin/referrals/campaigns \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "name": "Spring 2026 Campaign",
    ...
  }
]
```

### Step 4: Get Active Campaigns
```bash
curl -X GET http://localhost:3001/admin/referrals/campaigns/active \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Step 5: Update Campaign
```bash
curl -X PUT http://localhost:3001/admin/referrals/campaigns/CAMPAIGN_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rewardAmount": 25,
    "isActive": true
  }'
```

### Step 6: Get All Referrals
```bash
curl -X GET http://localhost:3001/admin/referrals/all \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Step 7: Filter Referrals by Status
```bash
curl -X GET "http://localhost:3001/admin/referrals/all?status=completed" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Step 8: Get Analytics Overview
```bash
curl -X GET http://localhost:3001/admin/referrals/analytics/overview \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "totalReferrals": 1,
  "pendingReferrals": 0,
  "completedReferrals": 0,
  "rewardedReferrals": 1,
  "fraudulentReferrals": 0,
  "totalRewardsDistributed": "10.0000000"
}
```

## Test Scenario 3: Fraud Detection

### Test 1: Self-Referral Prevention
```bash
# User tries to use their own referral code
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "selfreferral@test.com",
    "password": "password123",
    "name": "Self Referral",
    "referralCode": "ABC12345"
  }'
```

**Expected:** Registration succeeds but referral code is rejected (check logs)

### Test 2: Duplicate Referral
```bash
# User B tries to register again with different email but same referral
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "userb2@test.com",
    "password": "password123",
    "name": "User B Again",
    "referralCode": "ABC12345"
  }'
```

**Expected:** Registration succeeds but if User B already has a referral, it's rejected

### Test 3: Invalid Referral Code
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid@test.com",
    "password": "password123",
    "name": "Invalid Code User",
    "referralCode": "INVALID99"
  }'
```

**Expected:** Registration succeeds but referral code is rejected (check logs)

## Test Scenario 4: Campaign-Specific Referrals

### Step 1: Generate Referral Code for Campaign
```bash
curl -X POST http://localhost:3001/referrals/generate \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "CAMPAIGN_ID"
  }'
```

### Step 2: Register with Campaign Referral
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "userc@test.com",
    "password": "password123",
    "name": "User C",
    "referralCode": "NEW_CAMPAIGN_CODE"
  }'
```

## Verification Checklist

- [ ] User can generate referral code
- [ ] Referral code is unique (8 characters)
- [ ] New user can register with referral code
- [ ] Referral status changes from pending → completed → rewarded
- [ ] Stats are calculated correctly
- [ ] Admin can create campaigns
- [ ] Admin can list all referrals
- [ ] Admin can view analytics
- [ ] Fraud detection prevents self-referrals
- [ ] Invalid codes are rejected gracefully
- [ ] Notifications are sent (check notifications table)

## Database Verification

### Check Referrals Table
```sql
SELECT * FROM referrals;
```

### Check Campaigns Table
```sql
SELECT * FROM referral_campaigns;
```

### Check Notifications
```sql
SELECT * FROM notifications WHERE type IN ('REFERRAL_COMPLETED', 'REFERRAL_REWARD');
```

### Check User Referral Stats
```sql
SELECT 
  u.email,
  COUNT(r.id) as total_referrals,
  SUM(CASE WHEN r.status = 'rewarded' THEN r.reward_amount::numeric ELSE 0 END) as total_rewards
FROM users u
LEFT JOIN referrals r ON u.id = r.referrer_id
GROUP BY u.id, u.email;
```

## Troubleshooting

### Issue: Referral not completing after deposit
**Check:**
1. Is the `user.first-deposit` event being emitted?
2. Check application logs for fraud detection warnings
3. Verify deposit amount meets `minDepositAmount`
4. Check referral status in database

### Issue: Rewards not distributed
**Check:**
1. Is referral status `COMPLETED`?
2. Has user reached `maxRewardsPerUser` limit?
3. Is campaign still active?
4. Check event emitter logs

### Issue: Cannot create campaign
**Check:**
1. Is user role set to 'ADMIN'?
2. Are all required fields provided?
3. Check validation errors in response

## Success Criteria

✅ All API endpoints return expected responses
✅ Referral flow works end-to-end
✅ Fraud detection prevents abuse
✅ Admin can manage campaigns
✅ Stats are accurate
✅ Database records are created correctly
✅ No TypeScript compilation errors
✅ Unit tests pass
