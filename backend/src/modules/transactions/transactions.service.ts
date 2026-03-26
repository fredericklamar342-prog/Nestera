import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { PageDto } from '../../common/dto/page.dto';
import { PageMetaDto } from '../../common/dto/page-meta.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(LedgerTransaction)
    private readonly transactionRepository: Repository<LedgerTransaction>,
  ) {}

  async findAllForUser(
    userId: string,
    queryDto: TransactionQueryDto,
  ): Promise<PageDto<TransactionResponseDto>> {
    const queryBuilder = this.buildQuery(userId, queryDto);

    // Apply pagination
    queryBuilder.skip(queryDto.skip).take(queryDto.limit ?? 10);

    const [data, totalItemCount] = await queryBuilder.getManyAndCount();

    // Transform to response DTOs with formatted dates
    const transformedData = data.map((transaction) =>
      this.transformToResponseDto(transaction),
    );

    const meta = new PageMetaDto({
      pageOptionsDto: queryDto,
      totalItemCount,
    });

    return new PageDto(transformedData, meta);
  }

  private buildQuery(
    userId: string,
    queryDto: TransactionQueryDto,
  ): SelectQueryBuilder<LedgerTransaction> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    // Filter by transaction types
    if (queryDto.type && queryDto.type.length > 0) {
      queryBuilder.andWhere('transaction.type IN (:...types)', {
        types: queryDto.type,
      });
    }

    // Filter by date range
    if (queryDto.startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', {
        startDate: new Date(queryDto.startDate),
      });
    }

    if (queryDto.endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', {
        endDate: new Date(queryDto.endDate),
      });
    }

    // Filter by pool ID
    if (queryDto.poolId) {
      queryBuilder.andWhere('transaction.poolId = :poolId', {
        poolId: queryDto.poolId,
      });
    }

    // Apply ordering
    queryBuilder.orderBy('transaction.createdAt', queryDto.order ?? 'DESC');

    return queryBuilder;
  }

  private transformToResponseDto(
    transaction: LedgerTransaction,
  ): TransactionResponseDto {
    const createdAt = new Date(transaction.createdAt);

    return {
      id: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      amount: transaction.amount,
      publicKey: transaction.publicKey,
      eventId: transaction.eventId,
      transactionHash: transaction.transactionHash,
      ledgerSequence: transaction.ledgerSequence,
      poolId: transaction.poolId,
      metadata: transaction.metadata,
      createdAt: createdAt.toISOString(),
      formattedDate: createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      formattedTime: createdAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  }
}
