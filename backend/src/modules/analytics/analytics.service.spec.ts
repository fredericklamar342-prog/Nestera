import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { User } from '../user/entities/user.entity';
import { ProcessedStellarEvent } from '../blockchain/entities/processed-event.entity';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';
import { SavingsService as BlockchainSavingsService } from '../blockchain/savings.service';
import { StellarService } from '../blockchain/stellar.service';
import { OracleService } from '../blockchain/oracle.service';
import { PortfolioTimeframe } from './dto/portfolio-timeline-query.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let userRepository: { findOne: jest.Mock };
  let eventRepository: { find: jest.Mock };
  let transactionRepository: { find: jest.Mock };
  let blockchainSavingsService: { getUserSavingsBalance: jest.Mock };
  let stellarService: { getHorizonServer: jest.Mock };
  let oracleService: {
    convertXLMToUsd: jest.Mock;
    convertToUsd: jest.Mock;
    convertAQUAToUsd: jest.Mock;
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
    };

    eventRepository = {
      find: jest.fn(),
    };

    transactionRepository = {
      find: jest.fn(),
    };

    blockchainSavingsService = {
      getUserSavingsBalance: jest.fn(),
    };

    stellarService = {
      getHorizonServer: jest.fn(),
    };

    oracleService = {
      convertXLMToUsd: jest.fn(),
      convertToUsd: jest.fn(),
      convertAQUAToUsd: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(ProcessedStellarEvent),
          useValue: eventRepository,
        },
        {
          provide: getRepositoryToken(LedgerTransaction),
          useValue: transactionRepository,
        },
        {
          provide: BlockchainSavingsService,
          useValue: blockchainSavingsService,
        },
        {
          provide: StellarService,
          useValue: stellarService,
        },
        {
          provide: OracleService,
          useValue: oracleService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('calculates 1W portfolio timeline correctly by working backward', async () => {
    const userId = 'user-1';
    const publicKey = 'GABC123';
    const now = new Date('2024-03-24T12:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    userRepository.findOne.mockResolvedValue({ id: userId, publicKey });
    blockchainSavingsService.getUserSavingsBalance.mockResolvedValue({
      total: 1000,
    });

    // Events in reverse chronological order
    eventRepository.find.mockResolvedValue([
      {
        eventType: 'Deposit',
        eventData: { amount: 200, user: publicKey },
        processedAt: new Date('2024-03-23T10:00:00Z'), // Yesterday
      },
      {
        eventType: 'Withdrawal',
        eventData: { amount: 100, user: publicKey },
        processedAt: new Date('2024-03-22T10:00:00Z'), // 2 days ago
      },
      {
        eventType: 'InterestAccrued',
        eventData: { amount: 50, user: publicKey },
        processedAt: new Date('2024-03-21T10:00:00Z'), // 3 days ago
      },
    ]);

    const result = await service.getPortfolioTimeline(
      userId,
      PortfolioTimeframe.WEEK,
    );

    // Expecting 7 data points (one per day)
    expect(result).toHaveLength(7);

    // Last point (today) should be current balance
    expect(result[6].value).toBe(1000);

    // Point 5 (yesterday balance before deposit)
    // Balance(today) = 1000. Balance(yesterday) = 1000 - 200 = 800.
    expect(result[5].value).toBe(1000); // Wait, my logic shows balance at the END of the period.
    // My code:
    // periodEnd = now - i * interval
    // timeline.push({ date: periodEnd, value: runningBalance })
    // runningBalance -= netChangeInPeriod

    // Result[6] is i=0 (now): value 1000. runningBalance becomes 1000 - 0 = 1000.
    // Result[5] is i=1 (now - 1d): value 1000. runningBalance becomes 1000 - 200 = 800.
    // Result[4] is i=2 (now - 2d): value 800. runningBalance becomes 800 - (-100) = 900.
    // Result[3] is i=3 (now - 3d): value 900. runningBalance becomes 900 - 50 = 850.

    expect(result[6].value).toBe(1000);
    expect(result[5].value).toBe(1000);
    expect(result[4].value).toBe(800);
    expect(result[3].value).toBe(900);
    expect(result[2].value).toBe(850);
    expect(result[1].value).toBe(850);
    expect(result[0].value).toBe(850);
  });

  afterAll(() => {
    jest.useRealTimers();
  });
});
