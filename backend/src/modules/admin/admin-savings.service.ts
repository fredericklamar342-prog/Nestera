import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';
import { CreateProductDto } from '../savings/dto/create-product.dto';
import { UpdateProductDto } from '../savings/dto/update-product.dto';
import { SavingsService as BlockchainSavingsService } from '../blockchain/savings.service';
import { PageOptionsDto } from '../../common/dto/page-options.dto';

@Injectable()
export class AdminSavingsService {
  private readonly logger = new Logger(AdminSavingsService.name);

  constructor(
    @InjectRepository(SavingsProduct)
    private readonly products: Repository<SavingsProduct>,
    @InjectRepository(UserSubscription)
    private readonly subscriptions: Repository<UserSubscription>,
    private readonly blockchainSavings: BlockchainSavingsService,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<SavingsProduct> {
    this.validateProductParams(
      dto.interestRate,
      dto.minAmount,
      dto.maxAmount,
      dto.tenureMonths,
    );
    const product = this.products.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.products.save(product);

    if (saved.contractId) {
      await this.syncWithContract(saved);
    }

    return saved;
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
  ): Promise<SavingsProduct> {
    const product = await this.findOrFail(id);

    const newMin = dto.minAmount ?? product.minAmount;
    const newMax = dto.maxAmount ?? product.maxAmount;
    const newRate = dto.interestRate ?? product.interestRate;
    const newTenure = dto.tenureMonths ?? product.tenureMonths;
    this.validateProductParams(newRate, newMin, newMax, newTenure ?? undefined);

    Object.assign(product, dto);
    const updated = await this.products.save(product);

    if (updated.contractId) {
      await this.syncWithContract(updated);
    }

    return updated;
  }

  async archiveProduct(id: string): Promise<{ id: string; archived: boolean }> {
    const product = await this.findOrFail(id);

    const activeCount = await this.subscriptions.count({
      where: { productId: id, status: 'ACTIVE' as any },
    });
    if (activeCount > 0) {
      throw new BadRequestException(
        `Cannot archive product with ${activeCount} active subscription(s). Deactivate first.`,
      );
    }

    product.isActive = false;
    // Soft-delete: mark archived via a dedicated flag if present, else just deactivate
    await this.products.save(product);
    return { id, archived: true };
  }

  async setActive(id: string, isActive: boolean): Promise<SavingsProduct> {
    const product = await this.findOrFail(id);
    product.isActive = isActive;
    const updated = await this.products.save(product);

    if (updated.contractId) {
      await this.syncWithContract(updated);
    }

    return updated;
  }

  async getSubscribers(
    id: string,
    opts: PageOptionsDto,
  ): Promise<{
    data: UserSubscription[];
    meta: { total: number; page: number; limit: number };
  }> {
    await this.findOrFail(id);

    const [data, total] = await this.subscriptions.findAndCount({
      where: { productId: id },
      order: { createdAt: 'DESC' },
      skip: opts.skip,
      take: opts.limit,
    });

    return {
      data,
      meta: { total, page: opts.page ?? 1, limit: opts.limit ?? 10 },
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async findOrFail(id: string): Promise<SavingsProduct> {
    const product = await this.products.findOne({ where: { id } });
    if (!product)
      throw new NotFoundException(`Savings product ${id} not found`);
    return product;
  }

  private validateProductParams(
    interestRate?: number,
    minAmount?: number,
    maxAmount?: number,
    tenureMonths?: number,
  ): void {
    if (interestRate != null && (interestRate < 0 || interestRate > 100)) {
      throw new BadRequestException('interestRate must be between 0 and 100');
    }
    if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
      throw new BadRequestException('minAmount must be <= maxAmount');
    }
    if (minAmount != null && minAmount < 0) {
      throw new BadRequestException('minAmount must be >= 0');
    }
    if (tenureMonths != null && (tenureMonths < 1 || tenureMonths > 360)) {
      throw new BadRequestException('tenureMonths must be between 1 and 360');
    }
  }

  private async syncWithContract(product: SavingsProduct): Promise<void> {
    if (!product.contractId) return;
    try {
      const totalAssets = await this.blockchainSavings.getVaultTotalAssets(
        product.contractId,
      );
      await this.products.update(product.id, { tvlAmount: totalAssets / 1e7 });
      this.logger.log(
        `Synced product ${product.id} TVL from contract: ${totalAssets}`,
      );
    } catch (err) {
      // Non-fatal — log and continue; contract may not be deployed yet on testnet
      this.logger.warn(
        `Contract sync skipped for ${product.id}: ${(err as Error).message}`,
      );
    }
  }
}
