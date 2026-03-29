import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { xdr, nativeToScVal } from '@stellar/stellar-sdk';
import { createHash } from 'crypto';
import { DepositHandler } from './deposit.handler';
import { UserSubscription, SubscriptionStatus } from '../../savings/entities/user-subscription.entity';
import { User } from '../../user/entities/user.entity';
import { LedgerTransaction, LedgerTransactionType } from '../entities/transaction.entity';
import { SavingsProduct } from '../../savings/entities/savings-product.entity';

describe('DepositHandler', () => {
  let handler: DepositHandler;
  let dataSource: any;
  let entityManager: any;

  const DEPOSIT_HASH = createHash('sha256').update('Deposit').digest('hex');

  beforeEach(async () => {
    entityManager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === User) return userRepo;
        if (entity === LedgerTransaction) return txRepo;
        if (entity === UserSubscription) return subRepo;
        if (entity === SavingsProduct) return productRepo;
        return null;
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(entityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositHandler,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    handler = module.get<DepositHandler>(DepositHandler);
  });

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
  const productRepo = {
    findOne: jest.fn(),
  };

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    const mockUser = { id: 'user-id', publicKey: 'G...', defaultSavingsProductId: 'prod-id' };
    const mockProduct = { id: 'prod-id', isActive: true };
    const mockEvent = {
      id: 'event-1',
      topic: [Buffer.from(DEPOSIT_HASH, 'hex').toString('base64')],
      value: nativeToScVal({ to: 'G...', amount: BigInt(500) }).toXDR('base64'),
      ledger: 100,
      txHash: 'tx-hash',
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

    it('should process deposit successfully and update subscription', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      txRepo.findOne.mockResolvedValue(null);
      subRepo.findOne.mockResolvedValue({ userId: 'user-id', amount: 1000, status: SubscriptionStatus.ACTIVE });

      const result = await handler.handle(mockEvent);

      expect(result).toBe(true);
      expect(txRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        type: LedgerTransactionType.DEPOSIT,
        amount: '500',
      }));
      expect(subRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        amount: 1500,
      }));
    });

    it('should create new subscription if one does not exist', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      txRepo.findOne.mockResolvedValue(null);
      subRepo.findOne.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(mockProduct);

      const result = await handler.handle(mockEvent);

      expect(result).toBe(true);
      expect(subRepo.create).toHaveBeenCalled();
      expect(subRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        amount: 500,
      }));
    });

    it('should match topic by symbol', async () => {
      const symbolEvent = {
        ...mockEvent,
        topic: [nativeToScVal('Deposit', { type: 'symbol' }).toXDR('base64')],
      };
      userRepo.findOne.mockResolvedValue(mockUser);
      subRepo.findOne.mockResolvedValue({ userId: 'user-id', amount: 100, status: SubscriptionStatus.ACTIVE });

      const result = await handler.handle(symbolEvent);
      expect(result).toBe(true);
      expect(txRepo.save).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(handler.handle(mockEvent)).rejects.toThrow('Cannot map deposit payload publicKey to user');
    });
  });
});
