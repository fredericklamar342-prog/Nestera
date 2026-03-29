import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { xdr, nativeToScVal } from '@stellar/stellar-sdk';
import { createHash } from 'crypto';
import { WithdrawHandler } from './withdraw.handler';
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

describe('WithdrawHandler', () => {
  let handler: WithdrawHandler;
  let dataSource: any;
  let entityManager: any;

  const WITHDRAW_HASH = createHash('sha256').update('Withdraw').digest('hex');

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
      decrement: jest.fn().mockResolvedValue({}),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(entityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawHandler,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    handler = module.get<WithdrawHandler>(WithdrawHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    const mockUser = { id: 'user-id', publicKey: 'G...' };
    const mockEvent = {
      id: 'event-withdraw-1',
      topic: [Buffer.from(WITHDRAW_HASH, 'hex').toString('base64')],
      value: nativeToScVal({ publicKey: 'G...', amount: BigInt(200) }).toXDR(
        'base64',
      ),
      ledger: 200,
      txHash: 'withdraw-tx-hash',
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

    it('should process withdraw successfully and decrement subscription natively', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      txRepo.findOne.mockResolvedValue(null);
      subRepo.findOne.mockResolvedValue({
        id: 'sub-id',
        userId: 'user-id',
        amount: 1000,
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await handler.handle(mockEvent);

      expect(result).toBe(true);
      expect(txRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LedgerTransactionType.WITHDRAW,
          amount: '200',
          status: LedgerTransactionStatus.COMPLETED,
        }),
      );
      expect(entityManager.decrement).toHaveBeenCalledWith(
        UserSubscription,
        { id: 'sub-id' },
        'amount',
        200,
      );
    });

    it('should match topic by symbol', async () => {
      const symbolEvent = {
        ...mockEvent,
        topic: [nativeToScVal('Withdraw', { type: 'symbol' }).toXDR('base64')],
      };
      userRepo.findOne.mockResolvedValue(mockUser);
      subRepo.findOne.mockResolvedValue({
        id: 'sub-id',
        userId: 'user-id',
        amount: 500,
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await handler.handle(symbolEvent);
      expect(result).toBe(true);
      expect(txRepo.save).toHaveBeenCalled();
      expect(entityManager.decrement).toHaveBeenCalled();
    });

    it('should handle payload with "to" key and "value" amount', async () => {
      const alternativeEvent = {
        ...mockEvent,
        value: nativeToScVal({ to: 'G...', value: BigInt(150) }).toXDR(
          'base64',
        ),
      };
      userRepo.findOne.mockResolvedValue(mockUser);
      subRepo.findOne.mockResolvedValue({
        id: 'sub-id',
        userId: 'user-id',
        amount: 500,
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await handler.handle(alternativeEvent);
      expect(result).toBe(true);
      expect(txRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '150',
          publicKey: 'G...',
        }),
      );
    });

    it('should throw error if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(handler.handle(mockEvent)).rejects.toThrow(
        'Cannot map withdraw payload publicKey to user',
      );
    });

    it('should throw error if no active subscription found', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      txRepo.findOne.mockResolvedValue(null);
      subRepo.findOne.mockResolvedValue(null);

      await expect(handler.handle(mockEvent)).rejects.toThrow(
        'No active subscription found for user',
      );
    });

    it('should skip if event already persisted', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      txRepo.findOne.mockResolvedValue({ id: 'existing-tx' });

      const result = await handler.handle(mockEvent);
      expect(result).toBe(true); // Handler returns true even if skipping to indicate event was "handled" (consumed)
      expect(txRepo.save).not.toHaveBeenCalled();
      expect(entityManager.decrement).not.toHaveBeenCalled();
    });
  });
});
