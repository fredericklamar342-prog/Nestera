import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { User } from '../user/entities/user.entity';
import { ProcessedStellarEvent } from '../blockchain/entities/processed-event.entity';
import {
  LedgerTransaction,
  LedgerTransactionType,
} from '../blockchain/entities/transaction.entity';
import { SavingsService as BlockchainSavingsService } from '../blockchain/savings.service';
import { StellarService } from '../blockchain/stellar.service';
import { OracleService } from '../blockchain/oracle.service';

describe('AnalyticsService - Yield Breakdown', () => {
  let service: AnalyticsService;
  let transactionRepository: { find: jest.Mock };

  beforeEach(async () => {
    transactionRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ProcessedStellarEvent),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(LedgerTransaction),
          useValue: transactionRepository,
        },
        {
          provide: BlockchainSavingsService,
          useValue: { getUserSavingsBalance: jest.fn() },
        },
        {
          provide: StellarService,
          useValue: { getHorizonServer: jest.fn() },
        },
        {
          provide: OracleService,
          useValue: {
            convertXLMToUsd: jest.fn(),
            convertToUsd: jest.fn(),
            convertAQUAToUsd: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should return yield breakdown grouped by pool', async () => {
    const userId = 'user-1';

    transactionRepository.find.mockResolvedValue([
      {
        id: '1',
        userId,
        type: LedgerTransactionType.YIELD,
        amount: '420.50',
        poolId: 'xlm_staking',
        createdAt: new Date(),
      },
      {
        id: '2',
        userId,
        type: LedgerTransactionType.YIELD,
        amount: '150.25',
        poolId: 'aqua_farming',
        createdAt: new Date(),
      },
      {
        id: '3',
        userId,
        type: LedgerTransactionType.YIELD,
        amount: '75.00',
        poolId: 'xlm_staking',
        createdAt: new Date(),
      },
    ]);

    const result = await service.getYieldBreakdown(userId);

    expect(result).toEqual({
      pools: [
        { pool: 'XLM Staking', earned: 495.5 },
        { pool: 'AQUA Farming', earned: 150.25 },
      ],
      totalInterestEarned: 645.75,
    });
  });

  it('should return empty result for user with no yield transactions', async () => {
    const userId = 'user-2';

    transactionRepository.find.mockResolvedValue([]);

    const result = await service.getYieldBreakdown(userId);

    expect(result).toEqual({
      pools: [],
      totalInterestEarned: 0,
    });
  });
});
