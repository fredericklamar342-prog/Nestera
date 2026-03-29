import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { xdr, nativeToScVal } from '@stellar/stellar-sdk';
import { createHash } from 'crypto';
import { YieldHandler } from './yield.handler';
import {
  UserSubscription,
  SubscriptionStatus,
} from '../../savings/entities/user-subscription.entity';
import { User } from '../../user/entities/user.entity';
import {
  LedgerTransaction,
  LedgerTransactionType,
  LedgerTransactionStatus,
} from '../entities/transaction.entity';

describe('YieldHandler', () => {
  let handler: YieldHandler;
  let dataSource: any;
  let entityManager: any;

  const YIELD_HASH = createHash('sha256').update('Yield').digest('hex');
  const YLD_DIST_HASH = createHash('sha256').update('yld_dist').digest('hex');

  const userRepo = {
    findOne: jest.fn(),
  };
  const txRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn().mockImplementation((v) => v),
  };
  const subRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn().mockImplementation((v) => v),
  };

  beforeEach(async () => {
    entityManager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === User) return userRepo;
        if (entity === LedgerTransaction) return txRepo;
        if (entity === UserSubscription) return subRepo;
        return null;
      }),
      increment: jest.fn().mockResolvedValue({}),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(entityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [YieldHandler, { provide: DataSource, useValue: dataSource }],
    }).compile();

    handler = module.get<YieldHandler>(YieldHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    const mockUser = { id: 'user-id', publicKey: 'G...' };
    const mockEvent = {
      id: 'event-yield-1',
      topic: [Buffer.from(YIELD_HASH, 'hex').toString('base64')],
      value: nativeToScVal({ publicKey: 'G...', yield: BigInt(50) }).toXDR(
        'base64',
      ),
      ledger: 300,
      txHash: 'yield-tx-hash',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return false if topic does not match', async () => {
      const wrongEvent = { ...mockEvent, topic: ['AAAA'] };
      const result = await handler.handle(wrongEvent);
      expect(result).toBe(false);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should process yield successfully and increment interest natively', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      txRepo.findOne.mockResolvedValue(null);
      subRepo.findOne.mockResolvedValue({
        id: 'sub-id',
        userId: 'user-id',
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await handler.handle(mockEvent);

      expect(result).toBe(true);
      expect(txRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LedgerTransactionType.YIELD,
          amount: '50',
          status: LedgerTransactionStatus.COMPLETED,
        }),
      );
      expect(entityManager.increment).toHaveBeenCalledWith(
        UserSubscription,
        { id: 'sub-id' },
        'totalInterestEarned',
        50,
      );
    });

    it('should match topic by symbol "YieldPayout"', async () => {
      const symbolEvent = {
        ...mockEvent,
        topic: [
          nativeToScVal('YieldPayout', { type: 'symbol' }).toXDR('base64'),
        ],
      };
      userRepo.findOne.mockResolvedValue(mockUser);
      subRepo.findOne.mockResolvedValue({
        id: 'sub-id',
        userId: 'user-id',
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await handler.handle(symbolEvent);
      expect(result).toBe(true);
      expect(txRepo.save).toHaveBeenCalled();
      expect(entityManager.increment).toHaveBeenCalled();
    });

    it('should handle array-based payload for "yld_dist"', async () => {
      const arrayEvent = {
        id: 'event-yld-dist-1',
        topic: [Buffer.from(YLD_DIST_HASH, 'hex').toString('base64')],
        // [publicKey, total_yield, fee, net_yield]
        value: nativeToScVal([
          'G...',
          BigInt(100),
          BigInt(10),
          BigInt(90),
        ]).toXDR('base64'),
        ledger: 301,
        txHash: 'yld-dist-tx-hash',
      };
      userRepo.findOne.mockResolvedValue(mockUser);
      subRepo.findOne.mockResolvedValue({
        id: 'sub-id',
        userId: 'user-id',
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await handler.handle(arrayEvent);
      expect(result).toBe(true);
      expect(txRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '90',
          publicKey: 'G...',
        }),
      );
      expect(entityManager.increment).toHaveBeenCalledWith(
        UserSubscription,
        { id: 'sub-id' },
        'totalInterestEarned',
        90,
      );
    });

    it('should throw error if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(handler.handle(mockEvent)).rejects.toThrow(
        'Cannot map yield payload publicKey to user',
      );
    });

    it('should skip updating interest if no active subscription found (but still record tx)', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      txRepo.findOne.mockResolvedValue(null);
      subRepo.findOne.mockResolvedValue(null);

      const result = await handler.handle(mockEvent);
      expect(result).toBe(true);
      expect(txRepo.save).toHaveBeenCalled();
      expect(entityManager.increment).not.toHaveBeenCalled();
    });

    it('should skip if event already persisted', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      txRepo.findOne.mockResolvedValue({ id: 'existing-tx' });

      const result = await handler.handle(mockEvent);
      expect(result).toBe(true);
      expect(txRepo.save).not.toHaveBeenCalled();
      expect(entityManager.increment).not.toHaveBeenCalled();
    });
  });
});
