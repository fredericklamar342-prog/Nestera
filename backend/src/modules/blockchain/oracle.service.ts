import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

export interface PriceData {
  [symbol: string]: {
    usd: number;
  };
}

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);
  private readonly COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
  private readonly CACHE_TTL = 300000; // 5 minutes in milliseconds

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Fetch current price of XLM from CoinGecko with caching
   * @returns XLM price in USD
   */
  async getXLMPrice(): Promise<number> {
    return this.getCachedPrice('stellar');
  }

  /**
   * Fetch current price of AQUA from CoinGecko with caching
   * @returns AQUA price in USD
   */
  async getAQUAPrice(): Promise<number> {
    return this.getCachedPrice('aqua');
  }

  /**
   * Fetch prices for multiple assets with caching
   * @param assetIds Array of CoinGecko asset IDs
   * @returns Object with asset prices
   */
  async getAssetPrices(assetIds: string[]): Promise<PriceData> {
    const cacheKey = `prices:${assetIds.join(',')}`;

    // Try to get from cache first
    const cachedPrices = await this.cacheManager.get<PriceData>(cacheKey);
    if (cachedPrices) {
      this.logger.debug(`Cache hit for prices: ${assetIds.join(',')}`);
      return cachedPrices;
    }

    try {
      this.logger.debug(`Fetching fresh prices for: ${assetIds.join(',')}`);
      const response = await firstValueFrom(
        this.httpService.get<PriceData>(
          `${this.COINGECKO_API_URL}/simple/price`,
          {
            params: {
              ids: assetIds.join(','),
              vs_currencies: 'usd',
            },
          },
        ),
      );

      // Cache the response
      await this.cacheManager.set(cacheKey, response.data, this.CACHE_TTL);

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch prices for assets: ${(error as Error).message}`,
        error,
      );
      return {};
    }
  }

  /**
   * Convert asset amount to USD
   * @param amount Amount in asset units
   * @param assetId CoinGecko asset ID
   * @returns Amount in USD
   */
  async convertToUsd(amount: number, assetId: string): Promise<number> {
    const price = await this.getCachedPrice(assetId);
    return amount * price;
  }

  /**
   * Convert XLM amount to USD
   * @param xlmAmount Amount in XLM
   * @returns Amount in USD
   */
  async convertXLMToUsd(xlmAmount: number): Promise<number> {
    const price = await this.getXLMPrice();
    return xlmAmount * price;
  }

  /**
   * Convert AQUA amount to USD
   * @param aquaAmount Amount in AQUA
   * @returns Amount in USD
   */
  async convertAQUAToUsd(aquaAmount: number): Promise<number> {
    const price = await this.getAQUAPrice();
    return aquaAmount * price;
  }

  /**
   * Convert stroops (smallest XLM unit) to USD
   * @param stroops Amount in stroops
   * @returns Amount in USD
   */
  async convertStroopsToUsd(stroops: number): Promise<number> {
    const xlmPrice = await this.getXLMPrice();
    // 1 XLM = 10,000,000 stroops
    const xlmAmount = stroops / 10_000_000;
    return xlmAmount * xlmPrice;
  }

  /**
   * Get cached price for an asset or fetch fresh price if not cached
   * @param assetId CoinGecko asset ID
   * @returns Price in USD
   */
  private async getCachedPrice(assetId: string): Promise<number> {
    const cacheKey = `price:${assetId}`;

    // Try to get from cache first
    const cachedPrice = await this.cacheManager.get<number>(cacheKey);
    if (cachedPrice !== undefined) {
      this.logger.debug(`Cache hit for price: ${assetId}`);
      return cachedPrice;
    }

    try {
      this.logger.debug(`Fetching fresh price for: ${assetId}`);
      const response = await firstValueFrom(
        this.httpService.get<PriceData>(
          `${this.COINGECKO_API_URL}/simple/price`,
          {
            params: {
              ids: assetId,
              vs_currencies: 'usd',
            },
          },
        ),
      );

      const price = response.data[assetId]?.usd;

      if (price === undefined) {
        this.logger.warn(`Price not found for asset: ${assetId}`);
        return 0;
      }

      // Cache the price
      await this.cacheManager.set(cacheKey, price, this.CACHE_TTL);

      return price;
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for asset ${assetId}: ${(error as Error).message}`,
        error,
      );
      return 0;
    }
  }
}
