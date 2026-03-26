import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { rpc } from '@stellar/stellar-sdk';
import { DeadLetterEvent } from './entities/dead-letter-event.entity';
import { IndexerState } from './entities/indexer-state.entity';
import { DepositHandler } from './event-handlers/deposit.handler';
import { YieldHandler } from './event-handlers/yield.handler';
import { StellarService } from './stellar.service';
import { SavingsProduct } from '../savings/entities/savings-product.entity';

/** Shape of a raw Soroban event as returned by the RPC. */
interface SorobanEvent {
  id?: string;
  ledger: number;
  topic?: unknown[];
  value?: unknown;
  txHash?: string;
  [key: string]: unknown;
}

@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);

  private rpcServer: rpc.Server | null = null;

  /** In-memory cache of contract IDs to monitor */
  private contractIds: Set<string> = new Set();

  /** In-memory state synced with DB */
  private indexerState: IndexerState | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly stellarService: StellarService,
    @InjectRepository(DeadLetterEvent)
    private readonly dlqRepo: Repository<DeadLetterEvent>,
    @InjectRepository(IndexerState)
    private readonly indexerStateRepo: Repository<IndexerState>,
    @InjectRepository(SavingsProduct)
    private readonly savingsProductRepo: Repository<SavingsProduct>,
    private readonly depositHandler: DepositHandler,
    private readonly yieldHandler: YieldHandler,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Blockchain Event Indexer...');

    this.rpcServer = this.stellarService.getRpcServer();

    await this.initializeIndexerState();
    await this.loadContractIds();

    this.logger.log(
      `Blockchain indexer initialized. Monitoring ${this.contractIds.size} contract(s).`,
    );
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async runIndexerCycle(): Promise<void> {
    if (!this.indexerState) return;
    if (this.contractIds.size === 0) return;

    let events: SorobanEvent[] = [];

    try {
      events = await this.fetchEvents();
    } catch (err) {
      this.logger.error(`Failed to fetch events: ${(err as Error).message}`);
      this.indexerState.updatedAt = new Date();
      await this.saveIndexerState();
      return;
    }

    let processed = 0;
    let failed = 0;

    for (const event of events) {
      const ok = await this.processEvent(event);
      ok ? processed++ : failed++;
    }

    this.indexerState.totalEventsProcessed += processed;
    this.indexerState.totalEventsFailed += failed;
    this.indexerState.updatedAt = new Date();

    await this.saveIndexerState();
  }

  private async initializeIndexerState() {
    let state = await this.indexerStateRepo.findOne({ where: {} });

    if (!state) {
      state = await this.indexerStateRepo.save(
        this.indexerStateRepo.create({
          lastProcessedLedger: 0,
          lastProcessedTimestamp: null,
          totalEventsProcessed: 0,
          totalEventsFailed: 0,
        }),
      );
    }

    this.indexerState = state;
  }

  private async loadContractIds() {
    const products = await this.savingsProductRepo.find({
      where: { isActive: true },
    });

    this.contractIds.clear();

    for (const p of products) {
      if (p.contractId) this.contractIds.add(p.contractId);
    }
  }

  private async saveIndexerState() {
    if (this.indexerState) {
      await this.indexerStateRepo.save(this.indexerState);
    }
  }

  private async processEvent(event: SorobanEvent): Promise<boolean> {
    try {
      await this.handleEvent(event);

      if (
        this.indexerState &&
        event.ledger > this.indexerState.lastProcessedLedger
      ) {
        this.indexerState.lastProcessedLedger = event.ledger;
        this.indexerState.lastProcessedTimestamp = Date.now();
      }

      return true;
    } catch (err) {
      const msg = (err as Error).message;

      await this.dlqRepo.save(
        this.dlqRepo.create({
          ledgerSequence: event.ledger,
          rawEvent: JSON.stringify(event),
          errorMessage: msg,
        }),
      );

      return false;
    }
  }

  private async handleEvent(event: SorobanEvent): Promise<void> {
    if (await this.depositHandler.handle(event)) return;
    if (await this.yieldHandler.handle(event)) return;

    this.logger.debug(`Unhandled event: ${JSON.stringify(event.topic)}`);
  }

  private async fetchEvents(): Promise<SorobanEvent[]> {
    if (!this.rpcServer || !this.indexerState) return [];

    const results: SorobanEvent[] = [];

    for (const contractId of this.contractIds) {
      const rpcEvents = await (this.rpcServer as any).getEvents({
        startLedger: this.indexerState.lastProcessedLedger + 1,
        filters: [{ contractIds: [contractId] }],
      });

      for (const e of rpcEvents.events || []) {
        results.push({
          id: e.id,
          ledger: parseInt(e.ledger, 10),
          topic: e.topic,
          value: e.value,
          txHash: e.txHash,
        });
      }
    }

    return results.sort((a, b) => a.ledger - b.ledger);
  }

  getIndexerState() {
    return this.indexerState;
  }

  getLastProcessedTimestamp(): number | null {
    return this.indexerState?.lastProcessedTimestamp ?? null;
  }

  async reloadContractIds() {
    await this.loadContractIds();
  }

  getMonitoredContracts(): string[] {
    return Array.from(this.contractIds);
  }
}