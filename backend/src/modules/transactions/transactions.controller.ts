import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PageDto } from '../../common/dto/page.dto';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated transaction history for authenticated user',
    description:
      'Returns a paginated list of transactions with robust filtering by type, date range, and pool ID. ' +
      'Dates are formatted for frontend display to minimize client-side dependencies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated transaction history',
    type: PageDto<TransactionResponseDto>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getTransactions(
    @CurrentUser() user: { id: string },
    @Query() queryDto: TransactionQueryDto,
  ): Promise<PageDto<TransactionResponseDto>> {
    return this.transactionsService.findAllForUser(user.id, queryDto);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export transaction history as CSV',
    description:
      'Streams transactions as CSV for download with controlled memory usage while respecting query filters.',
  })
  @ApiResponse({ status: 200, description: 'CSV file stream' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async exportTransactions(
    @CurrentUser() user: { id: string },
    @Query() queryDto: TransactionQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="nestera_history.csv"',
    );

    const csvStream = await this.transactionsService.streamTransactionsCsv(
      user.id,
      queryDto,
    );

    csvStream.pipe(res);
  }
}
