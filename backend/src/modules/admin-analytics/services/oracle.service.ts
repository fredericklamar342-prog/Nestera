import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
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

  constructor(private readonly httpService: HttpService) {}

  /**
   * Fetch current price of an asset from CoinGecko
   * @param assetId CoinGecko asset ID (e.g., 'stellar')
   * @returns Price in USD
   */
  async getAssetPrice(assetId: string): Promise<number> {
    try {
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

      return price;
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for asset ${assetId}: ${(error as Error).message}`,
        error,
      );
      return 0;
    }
  }

  /**
   * Fetch prices for multiple assets
   * @param assetIds Array of CoinGecko asset IDs
   * @returns Object with asset prices
   */
  async getAssetPrices(assetIds: string[]): Promise<PriceData> {
    try {
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
   * Convert stroops (smallest XLM unit) to USD
   * @param stroops Amount in stroops
   * @param xlmPriceUsd XLM price in USD
   * @returns Amount in USD
   */
  convertStroopsToUsd(stroops: number, xlmPriceUsd: number): number {
    // 1 XLM = 10,000,000 stroops
    const xlmAmount = stroops / 10_000_000;
    return xlmAmount * xlmPriceUsd;
  }
}
