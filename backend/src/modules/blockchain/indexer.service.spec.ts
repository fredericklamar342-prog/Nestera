import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { IndexerState } from './entities/indexer-state.entity';
import { DeadLetterEvent } from './entities/dead-letter-event.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { StellarService } from './stellar.service';
import { DepositHandler } from './event-handlers/deposit.handler';
import { WithdrawHandler } from './event-handlers/withdraw.handler';
import { YieldHandler } from './event-handlers/yield.handler';

describe('IndexerService', () => {
  let service: IndexerService;
  let stellarService: StellarService;
  let indexerStateRepo: any;
  let savingsProductRepo: any;
  let deadLetterRepo: any;
  let depositHandler: any;
  let withdrawHandler: any;
  let yieldHandler: any;

  const mockIndexerState = {
    id: 'uuid',
    lastProcessedLedger: 100,
    totalEventsProcessed: 0,
    totalEventsFailed: 0,
    updatedAt: new Date(),
  };

  const mockSavingsProducts = [
    { contractId: 'CC1', isActive: true },
    { contractId: 'CC2', isActive: true },
  ];

  beforeEach(async () => {
    indexerStateRepo = {
      findOne: jest.fn().mockResolvedValue(mockIndexerState),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
      create: jest.fn().mockImplementation((val) => val),
    };

    savingsProductRepo = {
      find: jest.fn().mockResolvedValue(mockSavingsProducts),
    };

    deadLetterRepo = {
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
      create: jest.fn().mockImplementation((val) => val),
    };

    stellarService = {
      getRpcServer: jest.fn().mockReturnValue({
        getEvents: jest.fn(),
      }),
      getEvents: jest.fn(),
    } as any;

    depositHandler = { handle: jest.fn().mockResolvedValue(true) };
    withdrawHandler = { handle: jest.fn().mockResolvedValue(false) };
    yieldHandler = { handle: jest.fn().mockResolvedValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndexerService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: StellarService, useValue: stellarService },
        {
          provide: getRepositoryToken(IndexerState),
          useValue: indexerStateRepo,
        },
        {
          provide: getRepositoryToken(DeadLetterEvent),
          useValue: deadLetterRepo,
        },
        {
          provide: getRepositoryToken(SavingsProduct),
          useValue: savingsProductRepo,
        },
        { provide: DepositHandler, useValue: depositHandler },
        { provide: WithdrawHandler, useValue: withdrawHandler },
        { provide: YieldHandler, useValue: yieldHandler },
      ],
    }).compile();

    service = module.get<IndexerService>(IndexerService);
    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => null);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => null);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => null);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize state and load contract IDs', async () => {
      await service.onModuleInit();
      expect(indexerStateRepo.findOne).toHaveBeenCalled();
      expect(savingsProductRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(service.getMonitoredContracts()).toContain('CC1');
      expect(service.getMonitoredContracts()).toContain('CC2');
    });
  });

  describe('runIndexerCycle', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should fetch and process events successfully', async () => {
      const mockEvents = [
        {
          id: '1',
          ledger: '101',
          topic: ['deposit'],
          value: '100',
          txHash: 'hash1',
        },
      ];
      (stellarService.getEvents as jest.Mock).mockResolvedValue(mockEvents);

      await service.runIndexerCycle();

      expect(stellarService.getEvents).toHaveBeenCalledWith(101, [
        'CC1',
        'CC2',
      ]);
      expect(depositHandler.handle).toHaveBeenCalled();
      expect(indexerStateRepo.save).toHaveBeenCalled();
      expect(service.getIndexerState()?.lastProcessedLedger).toBe(101);
    });

    it('should handle failed events by logging to dead letter queue', async () => {
      const mockEvents = [
        {
          id: '1',
          ledger: '101',
          topic: ['deposit'],
          value: 'fail',
          txHash: 'hash1',
        },
      ];
      (stellarService.getEvents as jest.Mock).mockResolvedValue(mockEvents);
      depositHandler.handle.mockRejectedValue(new Error('Processing failed'));

      await service.runIndexerCycle();

      expect(deadLetterRepo.save).toHaveBeenCalled();
      expect(service.getIndexerState()?.totalEventsFailed).toBe(1);
    });

    it('should skip cycle if no active contracts', async () => {
      savingsProductRepo.find.mockResolvedValue([]);
      await service.runIndexerCycle();
      expect(stellarService.getEvents).not.toHaveBeenCalled();
    });
  });
});
