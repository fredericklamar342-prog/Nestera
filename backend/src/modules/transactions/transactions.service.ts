import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Readable } from 'stream';
import { format as csvFormat } from '@fast-csv/format';
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

  async streamTransactionsCsv(
    userId: string,
    queryDto: TransactionQueryDto,
  ): Promise<Readable> {
    const chunkSize = Number(queryDto.limit ?? 1000);
    let offset = 0;

    const csvStream = csvFormat({ headers: true, quoteColumns: true });

    (async () => {
      try {
        while (true) {
          const batch = await this.buildQuery(userId, queryDto)
            .skip(offset)
            .take(chunkSize)
            .getMany();

          if (!batch.length) {
            break;
          }

          for (const tx of batch) {
            const dto = this.transformToResponseDto(tx);
            csvStream.write({
              id: dto.id,
              userId: dto.userId,
              type: dto.type,
              amount: dto.amount,
              amountFormatted: dto.amountFormatted?.display ?? '',
              publicKey: dto.publicKey ?? '',
              eventId: dto.eventId,
              transactionHash: dto.transactionHash ?? '',
              ledgerSequence: dto.ledgerSequence ?? '',
              poolId: dto.poolId ?? '',
              assetId: dto.assetId ?? '',
              metadata: dto.metadata ? JSON.stringify(dto.metadata) : '',
              createdAt: dto.createdAt,
            });
          }

          offset += chunkSize;
        }
      } catch (error) {
        csvStream.destroy(error);
      } finally {
        csvStream.end();
      }
    })();

    return csvStream;
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

    // Extract asset ID from metadata or use default USDC
    const assetId = this.extractAssetId(transaction);

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
      // Add assetId for interceptor formatting (will be enriched by interceptor)
      assetId,
    } as TransactionResponseDto;
  }

  /**
   * Extract asset ID from transaction metadata or return default
   */
  private extractAssetId(transaction: LedgerTransaction): string {
    // Check metadata for asset information
    if (transaction.metadata?.assetId) {
      return transaction.metadata.assetId as string;
    }

    if (transaction.metadata?.contractId) {
      return transaction.metadata.contractId as string;
    }

    // Check if poolId corresponds to a known asset
    // For now, default to USDC as it's the primary asset
    return 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
  }
}
