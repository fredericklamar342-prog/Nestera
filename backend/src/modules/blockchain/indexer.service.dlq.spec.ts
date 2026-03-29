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

describe('IndexerService (DLQ Integration)', () => {
  let service: IndexerService;
  let deadLetterRepo: any;
  let depositHandler: any;
  let withdrawHandler: any;
  let yieldHandler: any;
  let stellarService: any;

  beforeEach(async () => {
    deadLetterRepo = {
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
      create: jest.fn().mockImplementation((val) => val),
    };

    const indexerStateRepo = {
      findOne: jest.fn().mockResolvedValue({
        lastProcessedLedger: 100,
        totalEventsProcessed: 0,
        totalEventsFailed: 0,
      }),
      save: jest.fn(),
      create: jest.fn(),
    };

    const savingsProductRepo = {
      find: jest.fn().mockResolvedValue([{ contractId: 'C1', isActive: true }]),
    };

    stellarService = {
      getRpcServer: jest.fn(),
      getEvents: jest.fn(),
    };

    depositHandler = { handle: jest.fn() };
    withdrawHandler = { handle: jest.fn() };
    yieldHandler = { handle: jest.fn() };

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
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => null);
  });

  it('should capture a failing event and save it to the DLQ', async () => {
    // Arrange
    const mockEvent = {
      id: 'event-fail-1',
      ledger: 105,
      topic: ['Withdraw'],
      value: 'corrupted-data',
      txHash: 'tx-fail-hash',
    };

    // Simulate handlers - deposit and withdraw skip (return false), yield throws
    depositHandler.handle.mockResolvedValue(false);
    withdrawHandler.handle.mockResolvedValue(false);
    yieldHandler.handle.mockRejectedValue(
      new Error('Decoding error at ledger 105'),
    );

    // Act
    await service.onModuleInit();
    const result = await (service as any).processEvent(mockEvent);

    // Assert
    expect(result).toBe(false);
    expect(deadLetterRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ledgerSequence: 105,
        rawEvent: JSON.stringify(mockEvent),
        errorMessage: 'Decoding error at ledger 105',
      }),
    );
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('FAILURE at Ledger 105'),
    );
  });

  it('should continue processing the cycle even if one event fails', async () => {
    // Arrange
    const mockEvents = [
      { id: '1', ledger: 101, topic: ['T1'], value: 'V1' },
      { id: '2', ledger: 102, topic: ['T2'], value: 'V2' },
      { id: '3', ledger: 103, topic: ['T3'], value: 'V3' },
    ];
    stellarService.getEvents.mockResolvedValue(mockEvents);

    // Event 2 will fail
    depositHandler.handle.mockImplementation(async (e) => {
      if (e.id === '2') throw new Error('Crash');
      return true;
    });

    // Act
    await service.onModuleInit();
    await service.runIndexerCycle();

    // Assert
    expect(deadLetterRepo.save).toHaveBeenCalledTimes(1);
    expect(service.getIndexerState()?.totalEventsProcessed).toBe(2);
    expect(service.getIndexerState()?.totalEventsFailed).toBe(1);
  });
});
