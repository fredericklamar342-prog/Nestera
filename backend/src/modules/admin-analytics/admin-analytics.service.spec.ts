import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsService } from './admin-analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MedicalClaim } from '../claims/entities/medical-claim.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { ProtocolMetrics } from './entities/protocol-metrics.entity';
import { OracleService } from './services/oracle.service';
import { SavingsService } from '../blockchain/savings.service';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;

  const mockClaimRepository = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  };

  const mockDisputeRepository = {
    count: jest.fn(),
  };

  const mockSavingsProductRepository = {
    find: jest.fn(),
  };

  const mockProtocolMetricsRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOracleService = {
    getAssetPrice: jest.fn(),
  };

  const mockSavingsService = {
    getVaultTotalAssets: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsService,
        {
          provide: getRepositoryToken(MedicalClaim),
          useValue: mockClaimRepository,
        },
        {
          provide: getRepositoryToken(Dispute),
          useValue: mockDisputeRepository,
        },
        {
          provide: getRepositoryToken(SavingsProduct),
          useValue: mockSavingsProductRepository,
        },
        {
          provide: getRepositoryToken(ProtocolMetrics),
          useValue: mockProtocolMetricsRepository,
        },
        {
          provide: OracleService,
          useValue: mockOracleService,
        },
        {
          provide: SavingsService,
          useValue: mockSavingsService,
        },
      ],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('should return analytics overview', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '50000' }),
      };

      mockClaimRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(150);
      mockDisputeRepository.count.mockResolvedValue(10);
      mockClaimRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getOverview();

      expect(result).toHaveProperty('totalProcessedSweeps', 100);
      expect(result).toHaveProperty('activeDisputes', 10);
      expect(result).toHaveProperty('pendingMedicalClaims', 20);
      expect(result.totalClaimAmount).toBe(50000);
    });
  });
});
