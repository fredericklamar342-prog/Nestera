import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';
import {
  SavingsProduct,
  SavingsProductType,
  RiskLevel,
} from './entities/savings-product.entity';
import {
  UserSubscription,
  SubscriptionStatus,
} from './entities/user-subscription.entity';
import { SavingsGoal } from './entities/savings-goal.entity';
import { User } from '../user/entities/user.entity';
import { SavingsService as BlockchainSavingsService } from '../blockchain/savings.service';
import { PredictiveEvaluatorService } from './services/predictive-evaluator.service';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { RpcThrottleGuard } from '../../common/guards/rpc-throttle.guard';
import { Reflector } from '@nestjs/core';

describe('SavingsController (Enhanced)', () => {
  let controller: SavingsController;
  let service: SavingsService;

  const mockProducts = [
    {
      id: 'p1',
      name: 'Alpha Pool',
      interestRate: 10,
      createdAt: new Date('2026-01-01'),
      subscriptions: [
        { amount: 100, status: SubscriptionStatus.ACTIVE },
        { amount: 50, status: SubscriptionStatus.ACTIVE },
      ],
      riskLevel: RiskLevel.LOW,
    },
    {
      id: 'p2',
      name: 'Beta Pool',
      interestRate: 15,
      createdAt: new Date('2026-01-02'),
      subscriptions: [{ amount: 30, status: SubscriptionStatus.ACTIVE }],
      riskLevel: RiskLevel.MEDIUM,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavingsController],
      providers: [
        SavingsService,
        {
          provide: getRepositoryToken(SavingsProduct),
          useValue: {
            find: jest.fn().mockResolvedValue(mockProducts),
            findOneBy: jest.fn(),
          },
        },
        { provide: getRepositoryToken(UserSubscription), useValue: {} },
        { provide: getRepositoryToken(SavingsGoal), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(WithdrawalRequest), useValue: {} },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: BlockchainSavingsService, useValue: {} },
        { provide: PredictiveEvaluatorService, useValue: {} },
        { provide: RecommendationService, useValue: { getRecommendations: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: CACHE_MANAGER, useValue: { del: jest.fn() } },
        { provide: 'THROTTLER:MODULE_OPTIONS', useValue: {} },
        { provide: 'ThrottlerStorage', useValue: {} },
        Reflector,
      ],
    })
      .overrideGuard(RpcThrottleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SavingsController>(SavingsController);
    service = module.get<SavingsService>(SavingsService);
  });

  it('should return products sorted by APY (interestRate) DESC', async () => {
    const result = await controller.getProducts('apy');
    expect(result[0].id).toBe('p2'); // 15% > 10%
    expect(result[1].id).toBe('p1');
  });

  it('should return products sorted by TVL DESC', async () => {
    const result = await controller.getProducts('tvl');
    expect(result[0].id).toBe('p1'); // TVL 150 > TVL 30
    expect(result[1].id).toBe('p2');
    expect(result[0].tvlAmount).toBe(150);
  });

  it('should include riskLevel in the response', async () => {
    const result = await controller.getProducts();
    expect(result[0].riskLevel).toBeDefined();
    expect(Object.values(RiskLevel)).toContain(result[0].riskLevel);
  });
});
