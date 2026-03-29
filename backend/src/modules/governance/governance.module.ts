import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceController } from './governance.controller';
import { GovernanceProposalsController } from './governance-proposals.controller';
import { GovernanceService } from './governance.service';
import { GovernanceIndexerService } from './governance-indexer.service';
import { UserModule } from '../user/user.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { GovernanceProposal } from './entities/governance-proposal.entity';
import { Vote } from './entities/vote.entity';

@Module({
  imports: [
    UserModule,
    BlockchainModule,
    TypeOrmModule.forFeature([GovernanceProposal, Vote]),
  ],
  controllers: [GovernanceController, GovernanceProposalsController],
  providers: [GovernanceService, GovernanceIndexerService],
})
export class GovernanceModule {}
