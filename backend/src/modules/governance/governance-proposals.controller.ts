import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProposalListItemDto } from './dto/proposal-list-item.dto';
import { ProposalVotesResponseDto } from './dto/proposal-votes-response.dto';
import { ProposalStatus } from './entities/governance-proposal.entity';
import { GovernanceService } from './governance.service';

@ApiTags('governance')
@Controller('governance/proposals')
export class GovernanceProposalsController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get()
  @ApiOperation({
    summary: 'List governance proposals',
    description:
      'Returns indexed proposals from the DB cache, optionally filtered by status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ProposalStatus,
    description:
      'Filter by proposal status (e.g. ACTIVE, PASSED, FAILED, CANCELLED)',
    example: 'ACTIVE',
  })
  @ApiResponse({
    status: 200,
    description:
      'List of proposals with computed vote percentages and timeline boundaries',
    type: [ProposalListItemDto],
  })
  getProposals(
    @Query('status') statusKey?: string,
  ): Promise<ProposalListItemDto[]> {
    let status: ProposalStatus | undefined;

    if (statusKey !== undefined) {
      // Accept both enum keys (ACTIVE) and enum values (Active)
      const byKey =
        ProposalStatus[statusKey.toUpperCase() as keyof typeof ProposalStatus];
      const byValue = Object.values(ProposalStatus).includes(
        statusKey as ProposalStatus,
      )
        ? (statusKey as ProposalStatus)
        : undefined;
      status = byKey ?? byValue;

      if (!status) {
        throw new BadRequestException(
          `Invalid status "${statusKey}". Valid values: ${Object.keys(ProposalStatus).join(', ')}`,
        );
      }
    }

    return this.governanceService.getProposals(status);
  }

  @Get(':id/votes')
  @ApiOperation({
    summary: 'Get proposal vote tally and recent voters',
    description:
      'Returns a proposal vote tally plus the most recent voters for a given proposal onChainId.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Zero-based page index (20 votes per page)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Vote tally and recent voter list for proposal',
    type: ProposalVotesResponseDto,
  })
  getProposalVotes(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
  ): Promise<ProposalVotesResponseDto> {
    return this.governanceService.getProposalVotesByOnChainId(id, page);
  }
}
