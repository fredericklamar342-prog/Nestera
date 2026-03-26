import { Injectable } from '@nestjs/common';
import { StellarService } from '../blockchain/stellar.service';
import { SavingsService } from '../blockchain/savings.service';
import { UserService } from '../user/user.service';
import { DelegationResponseDto } from './dto/delegation-response.dto';
import { VotingPowerResponseDto } from './dto/voting-power-response.dto';

@Injectable()
export class GovernanceService {
  constructor(
    private readonly userService: UserService,
    private readonly stellarService: StellarService,
    private readonly savingsService: SavingsService,
  ) {}

  async getUserDelegation(userId: string): Promise<DelegationResponseDto> {
    const user = await this.userService.findById(userId);
    if (!user.publicKey) {
      return { delegate: null };
    }
    const delegate = await this.stellarService.getDelegationForUser(
      user.publicKey,
    );
    return { delegate };
  }

  async getUserVotingPower(userId: string): Promise<VotingPowerResponseDto> {
    const user = await this.userService.findById(userId);
    if (!user.publicKey) {
      return { votingPower: '0 NST' };
    }
    // Get NST governance token contract ID from config
    const governanceTokenContractId = process.env.NST_GOVERNANCE_CONTRACT_ID;
    if (!governanceTokenContractId) {
      throw new Error('NST governance token contract ID not configured');
    }
    // Read balance from the NST governance token contract
    const balance = await this.savingsService.getUserVaultBalance(
      governanceTokenContractId,
      user.publicKey,
    );
    // Convert to proper decimal representation (assuming 7 decimals like standard tokens)
    const votingPower = (balance / 10_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return { votingPower: `${votingPower} NST` };
  }
}