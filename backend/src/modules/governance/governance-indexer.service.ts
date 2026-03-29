import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { ethers } from 'ethers';
import {
  GovernanceProposal,
  ProposalStatus,
} from './entities/governance-proposal.entity';
import { Vote, VoteDirection } from './entities/vote.entity';

/**
 * Minimal ABI fragments for the DAO contract events we care about.
 * ProposalCreated: emitted when a new proposal is submitted on-chain.
 * VoteCast:        emitted when a wallet casts a For (1) or Against (0) vote.
 */
const DAO_ABI_FRAGMENTS = [
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 startBlock, uint256 endBlock)',
  'event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight)',
];

@Injectable()
export class GovernanceIndexerService implements OnModuleInit {
  private readonly logger = new Logger(GovernanceIndexerService.name);
  private contract: any; // ethers.Contract
  private provider: any; // ethers.JsonRpcProvider

  constructor(
    @InjectRepository(GovernanceProposal)
    private readonly proposalRepo: Repository<GovernanceProposal>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
  ) {}

  onModuleInit() {
    this.initIndexer();
  }

  private initIndexer(): void {
    const rpcUrl = process.env.RPC_URL;
    const contractAddress = process.env.DAO_CONTRACT_ADDRESS;

    if (!rpcUrl || !contractAddress) {
      this.logger.warn(
        'RPC_URL or DAO_CONTRACT_ADDRESS not set — governance indexer will not start.',
      );
      return;
    }

    // TODO: Implement ethers integration when ethers package is added
    // this.provider = new ethers.JsonRpcProvider(rpcUrl);
    // this.contract = new ethers.Contract(
    //   contractAddress,
    //   DAO_ABI_FRAGMENTS,
    //   this.provider,
    // );
    // this.contract.on('ProposalCreated', this.handleProposalCreated.bind(this));
    // this.contract.on('VoteCast', this.handleVoteCast.bind(this));

    this.logger.log(
      `Governance indexer listening on contract ${contractAddress}`,
    );
  }

  /**
   * Handles the ProposalCreated event.
   * Inserts a skeletal GovernanceProposal row with status=Active.
   */
  private async handleProposalCreated(
    proposalId: bigint,
    proposer: string,
    description: string,
    startBlock: bigint,
    endBlock: bigint,
  ): Promise<void> {
    const onChainId = Number(proposalId);

    const existing = await this.proposalRepo.findOneBy({ onChainId });
    if (existing) {
      this.logger.debug(`Proposal ${onChainId} already indexed — skipping.`);
      return;
    }

    const proposal = this.proposalRepo.create({
      onChainId,
      proposer,
      description,
      status: ProposalStatus.ACTIVE,
      startBlock: Number(startBlock),
      endBlock: Number(endBlock),
    });

    await this.proposalRepo.save(proposal);
    this.logger.log(
      `Indexed new proposal onChainId=${onChainId} from proposer=${proposer}`,
    );
  }

  /**
   * Handles the VoteCast event.
   * Maps support (1=For, 0=Against) to VoteDirection and upserts a Vote row
   * linked to the walletAddress and the corresponding GovernanceProposal.
   */
  private async handleVoteCast(
    voter: string,
    proposalId: bigint,
    support: number,
    weight: bigint,
  ): Promise<void> {
    const onChainId = Number(proposalId);

    const proposal = await this.proposalRepo.findOneBy({ onChainId });
    if (!proposal) {
      this.logger.warn(
        `VoteCast received for unknown proposal ${onChainId} — skipping.`,
      );
      return;
    }

    const direction: VoteDirection =
      support === 1 ? VoteDirection.FOR : VoteDirection.AGAINST;

    // Upsert: one vote per wallet per proposal
    const existing = await this.voteRepo.findOneBy({
      walletAddress: voter,
      proposalId: proposal.id,
    });

    if (existing) {
      existing.direction = direction;
      existing.weight = Number(weight);
      await this.voteRepo.save(existing);
      this.logger.debug(
        `Updated vote for wallet=${voter} on proposal=${onChainId}`,
      );
    } else {
      const vote = this.voteRepo.create({
        walletAddress: voter,
        direction,
        weight: Number(weight),
        proposal,
        proposalId: proposal.id,
      });
      await this.voteRepo.save(vote);
      this.logger.log(
        `Indexed vote wallet=${voter} direction=${VoteDirection[direction]} proposal=${onChainId}`,
      );
    }
  }

  /** Gracefully remove all contract listeners on shutdown. */
  async onModuleDestroy(): Promise<void> {
    if (this.contract) {
      await this.contract.removeAllListeners();
    }
  }
}
