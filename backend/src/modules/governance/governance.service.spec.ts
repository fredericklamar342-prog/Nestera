import { Test, TestingModule } from '@nestjs/testing';
import { GovernanceService } from './governance.service';
import { UserService } from '../user/user.service';
import { StellarService } from '../blockchain/stellar.service';
import { SavingsService } from '../blockchain/savings.service';

describe('GovernanceService', () => {
  let service: GovernanceService;
  let userService: { findById: jest.Mock };
  let stellarService: { getDelegationForUser: jest.Mock };
  let savingsService: { getUserVaultBalance: jest.Mock };

  beforeEach(async () => {
    userService = { findById: jest.fn() };
    stellarService = { getDelegationForUser: jest.fn() };
    savingsService = { getUserVaultBalance: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceService,
        { provide: UserService, useValue: userService },
        { provide: StellarService, useValue: stellarService },
        { provide: SavingsService, useValue: savingsService }, // 👈 this was missing
      ],
    }).compile();

    service = module.get<GovernanceService>(GovernanceService);
  });

  // --- getUserDelegation (existing tests, unchanged) ---

  it('returns null when the user has no linked wallet', async () => {
    userService.findById.mockResolvedValue({ id: 'user-1', publicKey: null });

    await expect(service.getUserDelegation('user-1')).resolves.toEqual({
      delegate: null,
    });
    expect(stellarService.getDelegationForUser).not.toHaveBeenCalled();
  });

  it('returns null when no delegation exists on-chain', async () => {
    userService.findById.mockResolvedValue({
      id: 'user-1',
      publicKey: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    });
    stellarService.getDelegationForUser.mockResolvedValue(null);

    await expect(service.getUserDelegation('user-1')).resolves.toEqual({
      delegate: null,
    });
  });

  it('returns the delegated wallet address when present', async () => {
    userService.findById.mockResolvedValue({
      id: 'user-1',
      publicKey: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    });
    stellarService.getDelegationForUser.mockResolvedValue(
      'GB7TAYQB6A6E7MCCKRUYJ4JYK2YTHJOTD4A5Q65XAH2EJQ2F6J67P5ST',
    );

    await expect(service.getUserDelegation('user-1')).resolves.toEqual({
      delegate: 'GB7TAYQB6A6E7MCCKRUYJ4JYK2YTHJOTD4A5Q65XAH2EJQ2F6J67P5ST',
    });
  });

  // --- getUserVotingPower (new tests) ---

  describe('getUserVotingPower', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      process.env = { ...OLD_ENV, NST_GOVERNANCE_CONTRACT_ID: 'CONTRACT123' };
    });

    afterEach(() => {
      process.env = OLD_ENV;
    });

    it('returns 0 NST when user has no publicKey', async () => {
      userService.findById.mockResolvedValue({ id: 'user-1', publicKey: null });

      await expect(service.getUserVotingPower('user-1')).resolves.toEqual({
        votingPower: '0 NST',
      });
    });

    it('returns formatted voting power when user has publicKey', async () => {
      userService.findById.mockResolvedValue({
        id: 'user-1',
        publicKey: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
      });
      savingsService.getUserVaultBalance.mockResolvedValue(50_000_000_000);

      const result = await service.getUserVotingPower('user-1');
      expect(result.votingPower).toContain('NST');
    });

    it('throws when NST_GOVERNANCE_CONTRACT_ID is not set', async () => {
      delete process.env.NST_GOVERNANCE_CONTRACT_ID;
      userService.findById.mockResolvedValue({
        id: 'user-1',
        publicKey: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
      });

      await expect(service.getUserVotingPower('user-1')).rejects.toThrow(
        'NST governance token contract ID not configured',
      );
    });
  });
});