# Referral System Quick Start Guide

## 1. Run the Migration

```bash
npm run typeorm migration:run
```

This creates the `referrals` and `referral_campaigns` tables.

## 2. Create a Default Campaign (Optional)

Use the admin API to create your first campaign:

```bash
curl -X POST http://localhost:3001/admin/referrals/campaigns \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Default Referral Program",
    "description": "Earn 10 tokens for each friend you refer",
    "rewardAmount": 10,
    "refereeRewardAmount": 5,
    "minDepositAmount": 50,
    "maxRewardsPerUser": 20
  }'
```

## 3. Integrate First Deposit Event

In your transaction service, emit the event when a user makes their first deposit:

```typescript
// backend/src/modules/transactions/transactions.service.ts

async createDeposit(userId: string, amount: string) {
  // Your deposit logic...
  const transaction = await this.saveTransaction(...);

  // Check if first deposit
  const depositCount = await this.transactionRepository.count({
    where: { userId, type: TxType.DEPOSIT },
  });

  if (depositCount === 1) {
    this.eventEmitter.emit('user.first-deposit', { userId, amount });
  }

  return transaction;
}
```

## 4. Handle Reward Distribution

Create a listener to credit user wallets when rewards are distributed:

```typescript
// backend/src/modules/wallet/wallet-events.listener.ts

@OnEvent('referral.reward.distribute')
async handleReferralReward(payload: {
  userId: string;
  amount: string;
  referralId: string;
  type: 'referrer' | 'referee';
}) {
  await this.walletService.credit(payload.userId, payload.amount, {
    type: 'REFERRAL_REWARD',
    referralId: payload.referralId,
  });
}
```

## 5. Test the Flow

### Step 1: User generates referral code
```bash
curl -X POST http://localhost:3001/referrals/generate \
  -H "Authorization: Bearer USER_TOKEN"
```

Response:
```json
{
  "referralCode": "ABC12345",
  "id": "uuid",
  "createdAt": "2026-03-29T..."
}
```

### Step 2: New user signs up with code
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "name": "New User",
    "referralCode": "ABC12345"
  }'
```

### Step 3: New user makes first deposit
```bash
# Your deposit endpoint
curl -X POST http://localhost:3001/transactions/deposit \
  -H "Authorization: Bearer NEW_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100",
    "txHash": "..."
  }'
```

### Step 4: Check referral stats
```bash
curl -X GET http://localhost:3001/referrals/stats \
  -H "Authorization: Bearer USER_TOKEN"
```

Response:
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

## 6. Monitor via Admin Dashboard

```bash
curl -X GET http://localhost:3001/admin/referrals/analytics/overview \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Response:
```json
{
  "totalReferrals": 150,
  "pendingReferrals": 30,
  "completedReferrals": 80,
  "rewardedReferrals": 70,
  "fraudulentReferrals": 5,
  "totalRewardsDistributed": "700.0000000"
}
```

## Common Issues

### Referral not completing
- Check if deposit amount meets `minDepositAmount`
- Verify `user.first-deposit` event is being emitted
- Check application logs for fraud detection warnings

### Rewards not distributed
- Ensure referral status is `COMPLETED`
- Check if user hit `maxRewardsPerUser` limit
- Verify campaign is active

### Cannot use referral code
- Code may be expired (check campaign dates)
- User may already be referred by someone else
- User cannot use their own code

## Next Steps

1. Build frontend UI for referral dashboard
2. Add email templates for referral invitations
3. Create social sharing buttons
4. Set up analytics tracking
5. Configure notification preferences

For detailed documentation, see:
- `backend/src/modules/referrals/README.md`
- `backend/src/modules/referrals/INTEGRATION_GUIDE.md`
