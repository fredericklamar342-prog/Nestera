# Referrals Module

A comprehensive referral system that allows users to invite friends and earn rewards when referrals complete their first deposit.

## Features

- ✅ Unique referral code generation per user
- ✅ Track referral signups and conversions
- ✅ Automatic reward calculation and distribution
- ✅ Campaign management for different referral programs
- ✅ Fraud detection for referral abuse
- ✅ Integration with notification system
- ✅ Admin APIs for managing referrals and campaigns

## Database Schema

### Referrals Table
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY,
  referrerId UUID REFERENCES users(id),
  refereeId UUID REFERENCES users(id),
  referralCode VARCHAR(20) UNIQUE,
  status VARCHAR(20), -- pending, completed, rewarded, expired, fraudulent
  rewardAmount DECIMAL(18, 7),
  campaignId UUID REFERENCES referral_campaigns(id),
  metadata JSONB,
  createdAt TIMESTAMP,
  completedAt TIMESTAMP,
  rewardedAt TIMESTAMP
);
```

### Referral Campaigns Table
```sql
CREATE TABLE referral_campaigns (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  rewardAmount DECIMAL(18, 7) NOT NULL,
  refereeRewardAmount DECIMAL(18, 7),
  minDepositAmount DECIMAL(18, 7) DEFAULT 0,
  maxRewardsPerUser INTEGER,
  isActive BOOLEAN DEFAULT true,
  startDate TIMESTAMP,
  endDate TIMESTAMP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## API Endpoints

### User Endpoints

#### Generate Referral Code
```http
POST /referrals/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaignId": "uuid" // optional
}

Response:
{
  "referralCode": "ABC12345",
  "id": "uuid",
  "createdAt": "2026-03-29T..."
}
```

#### Get Referral Statistics
```http
GET /referrals/stats
Authorization: Bearer <token>

Response:
{
  "totalReferrals": 5,
  "pendingReferrals": 2,
  "completedReferrals": 2,
  "rewardedReferrals": 1,
  "totalRewardsEarned": "50.0000000",
  "referralCode": "ABC12345"
}
```

#### Get My Referrals
```http
GET /referrals/my-referrals
Authorization: Bearer <token>

Response:
[
  {
    "id": "uuid",
    "referralCode": "ABC12345",
    "status": "rewarded",
    "rewardAmount": "10.0000000",
    "refereeEmail": "friend@example.com",
    "createdAt": "2026-03-29T...",
    "completedAt": "2026-03-30T...",
    "rewardedAt": "2026-03-30T..."
  }
]
```

### Admin Endpoints

#### Create Campaign
```http
POST /admin/referrals/campaigns
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Spring 2026 Referral Campaign",
  "description": "Earn 10 tokens for each referral",
  "rewardAmount": 10,
  "refereeRewardAmount": 5,
  "minDepositAmount": 100,
  "maxRewardsPerUser": 10,
  "startDate": "2026-03-01T00:00:00Z",
  "endDate": "2026-06-01T00:00:00Z"
}
```

#### Get All Campaigns
```http
GET /admin/referrals/campaigns
Authorization: Bearer <admin-token>
```

#### Update Campaign
```http
PUT /admin/referrals/campaigns/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "isActive": false
}
```

#### Get All Referrals
```http
GET /admin/referrals/all?status=completed&campaignId=uuid
Authorization: Bearer <admin-token>
```

#### Update Referral Status
```http
PUT /admin/referrals/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "fraudulent",
  "rewardAmount": 0
}
```

#### Get Analytics
```http
GET /admin/referrals/analytics/overview
Authorization: Bearer <admin-token>

Response:
{
  "totalReferrals": 150,
  "pendingReferrals": 30,
  "completedReferrals": 80,
  "rewardedReferrals": 70,
  "fraudulentReferrals": 5,
  "totalRewardsDistributed": "700.0000000"
}
```

## User Flow

### 1. User Registration with Referral Code
```typescript
// During signup
POST /auth/register
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "referralCode": "ABC12345"  // Optional
}
```

### 2. Generate Referral Code
```typescript
// After registration, user generates their own code
POST /referrals/generate
// Returns: { referralCode: "XYZ67890" }
```

### 3. Share Referral Code
User shares their code with friends via social media, email, etc.

### 4. Friend Signs Up
Friend uses the referral code during registration.

### 5. First Deposit Triggers Completion
When the friend makes their first deposit:
```typescript
// Automatically triggered by deposit event
Event: 'user.first-deposit'
Payload: { userId: 'friend-id', amount: '100' }
```

### 6. Automatic Reward Distribution
System automatically:
- Validates the deposit meets minimum requirements
- Runs fraud detection checks
- Marks referral as completed
- Distributes rewards to both referrer and referee
- Sends notifications

## Fraud Detection

The system includes multiple fraud detection mechanisms:

1. **Rapid Signup Detection**: Flags if a user has >10 referrals in 24 hours
2. **Self-Referral Prevention**: Users cannot use their own referral codes
3. **Duplicate Referral Check**: Users can only be referred once
4. **Suspicious Transaction Patterns**: Detects immediate withdrawals after deposit
5. **Campaign Validation**: Ensures campaigns are active and within date ranges
6. **Max Rewards Limit**: Enforces per-user reward caps

## Events

### Emitted Events

- `user.signup-with-referral`: When a user signs up with a referral code
- `referral.completed`: When a referral completes their first deposit
- `referral.reward.distribute`: When rewards are distributed

### Listened Events

- `user.first-deposit`: Triggers referral completion check

## Integration with Other Modules

### Notifications Module
Automatically sends notifications for:
- Referral completion
- Reward distribution

### Transactions Module
Monitors first deposits to trigger referral completion.

### Auth Module
Handles referral code application during user registration.

## Configuration

### Environment Variables
No additional environment variables required. Uses existing database configuration.

### Default Values
- Default reward amount: 10 tokens (if no campaign specified)
- Minimum deposit: 0 (configurable per campaign)
- Fraud detection threshold: 10 referrals per 24 hours

## Testing

Run tests:
```bash
npm test -- referrals.service.spec.ts
```

## Migration

Run the migration to create tables:
```bash
npm run typeorm migration:run
```

## Future Enhancements

- [ ] Multi-tier referral rewards (referrer of referrer)
- [ ] Time-limited bonus campaigns
- [ ] Referral leaderboards
- [ ] Social media integration for easy sharing
- [ ] Email templates for referral invitations
- [ ] Analytics dashboard with charts
- [ ] Referral link tracking (UTM parameters)
- [ ] A/B testing for different reward amounts
