# Referrals Module Integration Guide

This guide shows how to integrate the referrals module with your existing transaction/deposit flow.

## Integration Points

### 1. User Registration with Referral Code

The auth module already handles this automatically. When a user registers with a referral code:

```typescript
// In your frontend
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "referralCode": "ABC12345"  // Optional field
}
```

The system will:
- Create the user account
- Emit `user.signup-with-referral` event
- Apply the referral code automatically
- Link the new user to the referrer

### 2. First Deposit Detection

You need to emit an event when a user makes their first deposit. Here's how to integrate it:

#### Option A: In Your Transaction Service

```typescript
// backend/src/modules/transactions/transactions.service.ts

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TransactionsService {
  constructor(
    private eventEmitter: EventEmitter2,
    // ... other dependencies
  ) {}

  async createDeposit(userId: string, amount: string) {
    // Your existing deposit logic
    const transaction = await this.createTransaction({
      userId,
      type: TxType.DEPOSIT,
      amount,
      // ... other fields
    });

    // Check if this is the user's first deposit
    const depositCount = await this.transactionRepository.count({
      where: { userId, type: TxType.DEPOSIT },
    });

    if (depositCount === 1) {
      // This is the first deposit - emit event for referral system
      this.eventEmitter.emit('user.first-deposit', {
        userId,
        amount,
      });
    }

    return transaction;
  }
}
```

#### Option B: In Your Blockchain Event Handler

If deposits come from blockchain events:

```typescript
// backend/src/modules/blockchain/event-handlers/deposit.handler.ts

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DepositEventHandler {
  constructor(
    private eventEmitter: EventEmitter2,
    private transactionRepository: Repository<Transaction>,
  ) {}

  async handleDepositEvent(event: DepositEvent) {
    // Process the deposit
    const transaction = await this.processDeposit(event);

    // Check if first deposit
    const depositCount = await this.transactionRepository.count({
      where: { userId: transaction.userId, type: TxType.DEPOSIT },
    });

    if (depositCount === 1) {
      this.eventEmitter.emit('user.first-deposit', {
        userId: transaction.userId,
        amount: transaction.amount,
      });
    }
  }
}
```

### 3. Manual Reward Distribution (Optional)

If you want to manually trigger reward distribution:

```typescript
// In your admin service or controller
import { ReferralsService } from '../referrals/referrals.service';

@Injectable()
export class AdminService {
  constructor(private referralsService: ReferralsService) {}

  async processReferralRewards(referralId: string) {
    await this.referralsService.distributeRewards(referralId);
  }
}
```

### 4. Wallet/Balance Integration

The referral system emits `referral.reward.distribute` events. You need to listen to these and credit user accounts:

```typescript
// backend/src/modules/wallet/wallet-events.listener.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WalletService } from './wallet.service';

@Injectable()
export class WalletEventsListener {
  constructor(private walletService: WalletService) {}

  @OnEvent('referral.reward.distribute')
  async handleReferralReward(payload: {
    userId: string;
    amount: string;
    referralId: string;
    type: 'referrer' | 'referee';
  }) {
    // Credit the user's wallet/balance
    await this.walletService.credit(
      payload.userId,
      payload.amount,
      {
        type: 'REFERRAL_REWARD',
        referralId: payload.referralId,
        rewardType: payload.type,
      }
    );
  }
}
```

## Complete Example Flow

### Step 1: User A generates referral code
```http
POST /referrals/generate
Authorization: Bearer <user-a-token>

Response:
{
  "referralCode": "ABC12345",
  "id": "ref-uuid-1",
  "createdAt": "2026-03-29T10:00:00Z"
}
```

### Step 2: User A shares code with User B

User A shares "ABC12345" via email, social media, etc.

### Step 3: User B signs up with referral code
```http
POST /auth/register
{
  "email": "userb@example.com",
  "password": "password123",
  "name": "User B",
  "referralCode": "ABC12345"
}

Response:
{
  "user": { ... },
  "accessToken": "..."
}
```

Behind the scenes:
- User B account created
- Event `user.signup-with-referral` emitted
- Referral code applied
- Referral status: PENDING

### Step 4: User B makes first deposit
```http
POST /transactions/deposit
Authorization: Bearer <user-b-token>
{
  "amount": "100",
  "txHash": "..."
}
```

Behind the scenes:
- Deposit transaction created
- Event `user.first-deposit` emitted
- Referral system checks minimum deposit requirement
- Fraud detection runs
- Referral status: PENDING → COMPLETED
- Event `referral.completed` emitted

### Step 5: Automatic reward distribution
Behind the scenes:
- Referral status: COMPLETED → REWARDED
- Event `referral.reward.distribute` emitted (2x: for referrer and referee)
- Wallet service credits both accounts
- Notifications sent to both users

### Step 6: Users receive notifications
```http
GET /notifications
Authorization: Bearer <user-a-token>

Response:
[
  {
    "type": "REFERRAL_COMPLETED",
    "title": "Referral Completed!",
    "message": "Your referral has completed their first deposit...",
    ...
  },
  {
    "type": "REFERRAL_REWARD",
    "title": "Referral Reward",
    "message": "You earned 10.0000000 tokens for referring a friend!",
    ...
  }
]
```

## Testing the Integration

### 1. Test Referral Code Generation
```bash
curl -X POST http://localhost:3001/referrals/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Test Registration with Referral Code
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "referralCode": "ABC12345"
  }'
```

### 3. Test First Deposit Event (Manual Trigger)
```bash
curl -X POST http://localhost:3001/referrals/check-completion \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "depositAmount": "100"
  }'
```

### 4. Check Referral Stats
```bash
curl -X GET http://localhost:3001/referrals/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Referral not completing after deposit

Check:
1. Is the deposit amount >= campaign's `minDepositAmount`?
2. Was the `user.first-deposit` event emitted?
3. Check logs for fraud detection warnings
4. Verify referral status in database

### Rewards not distributed

Check:
1. Is the referral status `COMPLETED`?
2. Has the user reached `maxRewardsPerUser` limit?
3. Is the campaign still active?
4. Check event emitter logs

### Fraud detection false positives

Adjust thresholds in `referrals.service.ts`:
```typescript
// Current: 10 referrals in 24 hours
if (recentReferrals > 10) {
  // Increase this number if needed
}
```

## Database Queries for Debugging

### Check referral status
```sql
SELECT * FROM referrals WHERE referral_code = 'ABC12345';
```

### Check user's referrals
```sql
SELECT r.*, u.email as referee_email
FROM referrals r
LEFT JOIN users u ON r.referee_id = u.id
WHERE r.referrer_id = 'user-uuid';
```

### Check campaign details
```sql
SELECT * FROM referral_campaigns WHERE is_active = true;
```

### Check total rewards distributed
```sql
SELECT 
  SUM(reward_amount::numeric) as total_rewards,
  COUNT(*) as rewarded_count
FROM referrals
WHERE status = 'rewarded';
```
