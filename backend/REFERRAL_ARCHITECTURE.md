# Referral System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Flow                                │
└─────────────────────────────────────────────────────────────────┘

User A                    User B (Referee)              System
  │                             │                          │
  │ 1. Generate Code            │                          │
  ├────────────────────────────────────────────────────────>
  │                             │                          │
  │ 2. Share Code "ABC123"      │                          │
  ├─────────────────────────────>                          │
  │                             │                          │
  │                             │ 3. Register with Code    │
  │                             ├─────────────────────────>│
  │                             │                          │
  │                             │ 4. Make First Deposit    │
  │                             ├─────────────────────────>│
  │                             │                          │
  │                             │    5. Check & Complete   │
  │                             │    6. Fraud Detection    │
  │                             │    7. Distribute Rewards │
  │                             │                          │
  │ 8. Notification: Reward     │ 8. Notification: Bonus   │
  <─────────────────────────────┴──────────────────────────┤
  │                             │                          │
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Referrals Module                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   Controllers    │         │    Services      │             │
│  ├──────────────────┤         ├──────────────────┤             │
│  │ - Referrals      │────────>│ - Referrals      │             │
│  │ - Admin          │         │ - Campaigns      │             │
│  └──────────────────┘         └──────────────────┘             │
│           │                            │                        │
│           │                            │                        │
│           v                            v                        │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   Entities       │         │   Event Listener │             │
│  ├──────────────────┤         ├──────────────────┤             │
│  │ - Referral       │         │ - Signup         │             │
│  │ - Campaign       │         │ - First Deposit  │             │
│  └──────────────────┘         │ - Completion     │             │
│                                │ - Rewards        │             │
│                                └──────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Referral Code Generation
```
User Request
    │
    v
ReferralsController.generateReferralCode()
    │
    v
ReferralsService.generateReferralCode()
    │
    ├─> Validate User
    ├─> Check Existing Code
    ├─> Validate Campaign (if provided)
    ├─> Generate Unique Code
    └─> Save to Database
    │
    v
Return { referralCode, id, createdAt }
```

### 2. Referral Code Application
```
User Registration (with referralCode)
    │
    v
AuthService.register()
    │
    ├─> Create User
    └─> Emit 'user.signup-with-referral'
        │
        v
ReferralEventsListener.handleSignupWithReferral()
    │
    v
ReferralsService.applyReferralCode()
    │
    ├─> Validate Code
    ├─> Check Not Self-Referral
    ├─> Check Not Already Referred
    ├─> Validate Campaign Dates
    └─> Link Referee to Referral
```

### 3. Referral Completion
```
User Makes First Deposit
    │
    v
TransactionService.createDeposit()
    │
    └─> Emit 'user.first-deposit'
        │
        v
ReferralEventsListener.handleFirstDeposit()
    │
    v
ReferralsService.checkAndCompleteReferral()
    │
    ├─> Find Pending Referral
    ├─> Check Minimum Deposit
    ├─> Run Fraud Detection
    │   ├─> Rapid Signup Check
    │   ├─> Transaction Pattern Check
    │   └─> Mark as Fraudulent if Detected
    ├─> Mark as Completed
    └─> Emit 'referral.completed'
        │
        v
ReferralEventsListener.handleReferralCompleted()
    │
    ├─> Send Notification to Referrer
    └─> Trigger Reward Distribution
```

### 4. Reward Distribution
```
ReferralsService.distributeRewards()
    │
    ├─> Validate Referral Status
    ├─> Check Max Rewards Limit
    ├─> Calculate Reward Amounts
    ├─> Mark as Rewarded
    └─> Emit 'referral.reward.distribute' (2x)
        │
        ├─> For Referrer
        │   └─> WalletService.credit()
        │
        └─> For Referee
            └─> WalletService.credit()
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                         referrals                                │
├─────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                             │
│ referrerId          UUID → users(id)                             │
│ refereeId           UUID → users(id)                             │
│ referralCode        VARCHAR(20) UNIQUE                           │
│ status              ENUM (pending, completed, rewarded, ...)     │
│ rewardAmount        DECIMAL(18,7)                                │
│ campaignId          UUID → referral_campaigns(id)                │
│ metadata            JSONB                                        │
│ createdAt           TIMESTAMP                                    │
│ completedAt         TIMESTAMP                                    │
│ rewardedAt          TIMESTAMP                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FK
                              v
┌─────────────────────────────────────────────────────────────────┐
│                    referral_campaigns                            │
├─────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                             │
│ name                VARCHAR                                      │
│ description         TEXT                                         │
│ rewardAmount        DECIMAL(18,7)                                │
│ refereeRewardAmount DECIMAL(18,7)                                │
│ minDepositAmount    DECIMAL(18,7)                                │
│ maxRewardsPerUser   INTEGER                                      │
│ isActive            BOOLEAN                                      │
│ startDate           TIMESTAMP                                    │
│ endDate             TIMESTAMP                                    │
│ createdAt           TIMESTAMP                                    │
│ updatedAt           TIMESTAMP                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Event System

```
┌─────────────────────────────────────────────────────────────────┐
│                         Event Flow                               │
└─────────────────────────────────────────────────────────────────┘

Auth Module                 Referrals Module           Notifications
    │                             │                          │
    │ user.signup-with-referral   │                          │
    ├────────────────────────────>│                          │
    │                             │ Apply Code               │
    │                             │                          │
    │                             │                          │
Transaction Module                │                          │
    │                             │                          │
    │ user.first-deposit          │                          │
    ├────────────────────────────>│                          │
    │                             │ Check & Complete         │
    │                             │                          │
    │                             │ referral.completed       │
    │                             ├─────────────────────────>│
    │                             │                          │
    │                             │ referral.reward.distribute
    │                             ├─────────────────────────>│
    │                             │                          │
    │                             │                          │
Wallet Module                     │                          │
    │                             │                          │
    │<────────────────────────────┤                          │
    │ referral.reward.distribute  │                          │
    │ Credit Account              │                          │
```

## API Structure

```
/referrals
├── POST   /generate              Generate referral code
├── GET    /stats                 Get user statistics
├── GET    /my-referrals          List user's referrals
└── POST   /check-completion      Internal: Check completion

/admin/referrals
├── /campaigns
│   ├── POST   /                  Create campaign
│   ├── GET    /                  List all campaigns
│   ├── GET    /active            List active campaigns
│   ├── GET    /:id               Get campaign details
│   ├── PUT    /:id               Update campaign
│   └── DELETE /:id               Delete campaign
│
├── GET    /all                   List all referrals
├── PUT    /:id/status            Update referral status
├── POST   /:id/distribute-rewards Manual distribution
└── GET    /analytics/overview    Analytics dashboard
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Stack                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Authentication Layer                                         │
│     └─> JWT Auth Guard (all endpoints)                          │
│                                                                  │
│  2. Authorization Layer                                          │
│     └─> Roles Guard (admin endpoints)                           │
│                                                                  │
│  3. Validation Layer                                             │
│     ├─> DTO Validation (class-validator)                        │
│     └─> Business Logic Validation                               │
│                                                                  │
│  4. Fraud Detection Layer                                        │
│     ├─> Rapid Signup Detection                                  │
│     ├─> Self-Referral Prevention                                │
│     ├─> Duplicate Referral Check                                │
│     └─> Transaction Pattern Analysis                            │
│                                                                  │
│  5. Database Layer                                               │
│     ├─> Foreign Key Constraints                                 │
│     ├─> Unique Constraints                                      │
│     └─> Cascade Deletes                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Integrations                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Auth Module                                                     │
│  └─> Referral code in registration                              │
│                                                                  │
│  Transaction Module                                              │
│  └─> First deposit event emission                               │
│                                                                  │
│  Notification Module                                             │
│  └─> Automatic notifications                                    │
│                                                                  │
│  Wallet Module (To Be Implemented)                               │
│  └─> Reward distribution handler                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Database Indexes
- `referrerId` - Fast lookup of user's referrals
- `refereeId` - Fast lookup of who referred a user
- `referralCode` - Fast code validation
- `status` - Fast filtering by status

### Caching Strategy (Future)
- Cache active campaigns
- Cache user referral stats
- Cache fraud detection thresholds

### Query Optimization
- Use `count()` instead of loading all records
- Eager load relations only when needed
- Use query builder for complex filters

## Monitoring & Observability

### Key Metrics
- Referral creation rate
- Conversion rate (pending → completed)
- Fraud detection rate
- Average time to conversion
- Total rewards distributed

### Logging
- Referral code generation
- Code application
- Completion events
- Fraud detection triggers
- Reward distribution

### Alerts
- High fraud detection rate
- Unusual referral spike
- Reward distribution failures
- Campaign budget exceeded
