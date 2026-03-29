import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StellarService } from '../blockchain/stellar.service';
import { SavingsService } from '../blockchain/savings.service';
import { UserService } from '../user/user.service';
import { DelegationResponseDto } from './dto/delegation-response.dto';
import { ProposalListItemDto } from './dto/proposal-list-item.dto';
import { ProposalVotesResponseDto } from './dto/proposal-votes-response.dto';
import {
  GovernanceProposal,
  ProposalStatus,
} from './entities/governance-proposal.entity';
import { Vote, VoteDirection } from './entities/vote.entity';
import { VotingPowerResponseDto } from './dto/voting-power-response.dto';

@Injectable()
export class GovernanceService {
  constructor(
    private readonly userService: UserService,
    private readonly stellarService: StellarService,
    private readonly savingsService: SavingsService,
    @InjectRepository(GovernanceProposal)
    private readonly proposalRepo: Repository<GovernanceProposal>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
  ) {}

  async getProposals(status?: ProposalStatus): Promise<ProposalListItemDto[]> {
    const where = status ? { status } : {};
    const proposals = await this.proposalRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (proposals.length === 0) {
      return [];
    }

    const proposalIds = proposals.map((p) => p.id);

    // Aggregate vote counts per proposal in a single query
    const tallies: {
      proposalId: string;
      forCount: string;
      againstCount: string;
    }[] = await this.voteRepo
      .createQueryBuilder('vote')
      .select('vote.proposalId', 'proposalId')
      .addSelect(
        `SUM(CASE WHEN vote.direction = '${VoteDirection.FOR}' THEN 1 ELSE 0 END)`,
        'forCount',
      )
      .addSelect(
        `SUM(CASE WHEN vote.direction = '${VoteDirection.AGAINST}' THEN 1 ELSE 0 END)`,
        'againstCount',
      )
      .where('vote.proposalId IN (:...ids)', { ids: proposalIds })
      .groupBy('vote.proposalId')
      .getRawMany();

    const tallyMap = new Map(tallies.map((t) => [t.proposalId, t]));

    return proposals.map((proposal) => {
      const tally = tallyMap.get(proposal.id);
      const forCount = tally ? Number(tally.forCount) : 0;
      const againstCount = tally ? Number(tally.againstCount) : 0;
      const totalCount = forCount + againstCount;

      const forPercent =
        totalCount > 0 ? Math.round((forCount / totalCount) * 10000) / 100 : 0;
      const againstPercent =
        totalCount > 0
          ? Math.round((againstCount / totalCount) * 10000) / 100
          : 0;

      return {
        id: proposal.id,
        onChainId: proposal.onChainId,
        title: proposal.title,
        description: proposal.description ?? null,
        category: proposal.category,
        status: proposal.status,
        proposer: proposal.proposer ?? null,
        forPercent,
        againstPercent,
        timeline: {
          startTime: proposal.startBlock ?? null,
          endTime: proposal.endBlock ?? null,
        },
      };
    });
  }

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

  async getProposalVotesByOnChainId(
    onChainId: number,
    page = 0,
  ): Promise<ProposalVotesResponseDto> {
    const proposal = await this.proposalRepo.findOneBy({ onChainId });
    if (!proposal) {
      throw new NotFoundException(`Proposal ${onChainId} not found`);
    }

    const [votes, total] = await this.voteRepo.findAndCount({
      where: { proposalId: proposal.id },
      order: { createdAt: 'DESC' },
      take: 20,
      skip: page * 20,
    });

    let forWeight = 0;
    let againstWeight = 0;
    for (const vote of votes) {
      const voteWeight = Number(vote.weight) || 0;
      if (vote.direction === VoteDirection.FOR) {
        forWeight += voteWeight;
      } else {
        againstWeight += voteWeight;
      }
    }

    return {
      proposalOnChainId: onChainId,
      tally: {
        forVotes: votes.filter((vote) => vote.direction === VoteDirection.FOR)
          .length,
        againstVotes: votes.filter(
          (vote) => vote.direction === VoteDirection.AGAINST,
        ).length,
        forWeight: String(forWeight),
        againstWeight: String(againstWeight),
        totalWeight: String(forWeight + againstWeight),
      },
      recentVoters: votes.map((vote) => ({
        walletAddress: vote.walletAddress,
        direction: vote.direction,
        weight: String(vote.weight),
        votedAt: vote.createdAt.toISOString(),
      })),
      total,
      page,
    };
  }
}
