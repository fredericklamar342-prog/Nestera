import { Injectable, Logger } from '@nestjs/common';
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { StellarService } from './stellar.service';

export interface SavingsBalance {
  flexible: number;
  locked: number;
  total: number;
}

@Injectable()
export class SavingsService {
  private readonly logger = new Logger(SavingsService.name);

  constructor(private readonly stellarService: StellarService) {}

  /**
   * Fetch total assets from a Soroban vault contract
   * @param contractId The Soroban contract ID
   * @returns Total assets in stroops
   */
  async getVaultTotalAssets(contractId: string): Promise<number> {
    try {
      const totalAssets = await this.stellarService.invokeContractRead(
        contractId,
        'total_assets',
      );

      // Convert to number if needed
      if (typeof totalAssets === 'number') {
        return totalAssets;
      }

      if (typeof totalAssets === 'string') {
        return parseInt(totalAssets, 10);
      }

      this.logger.warn(
        `Unexpected type for total_assets from contract ${contractId}: ${typeof totalAssets}`,
      );
      return 0;
    } catch (error) {
      this.logger.error(
        `Failed to fetch total_assets from contract ${contractId}: ${(error as Error).message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Fetch total savings for a user from the Soroban contract
   * @param publicKey The user's Stellar public key
   * @returns Object containing flexible, locked, and total savings balances
   */
  async getUserSavingsBalance(publicKey: string): Promise<SavingsBalance> {
    try {
      const horizonServer = this.stellarService.getHorizonServer();

      // Fetch account to get current state
      const account = await horizonServer
        .accounts()
        .accountId(publicKey)
        .call();

      // For now, return a structure based on available data
      // In a production system, this would query the actual Soroban contract
      const flexibleBalance = 0;
      const lockedBalance = 0;

      return {
        flexible: flexibleBalance,
        locked: lockedBalance,
        total: flexibleBalance + lockedBalance,
      };
    } catch (error) {
      this.logger.warn(
        `Could not fetch savings for ${publicKey}: ${error.message}`,
      );
      return {
        flexible: 0,
        locked: 0,
        total: 0,
      };
    }
  }

  async invokeContractRead<T = unknown>(
    contractId: string,
    method: string,
    args: xdr.ScVal[] = [],
    sourcePublicKey?: string,
  ): Promise<T> {
    const rpcServer = this.stellarService.getRpcServer();
    const sourceAccount = sourcePublicKey
      ? await rpcServer.getAccount(sourcePublicKey)
      : new Account(Keypair.random().publicKey(), '0');
    const contract = new Contract(contractId);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.stellarService.getNetworkPassphrase(),
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simulation = await rpcServer.simulateTransaction(transaction);

    if ('error' in simulation) {
      throw new Error(simulation.error);
    }

    return simulation.result
      ? (scValToNative(simulation.result.retval) as T)
      : (undefined as T);
  }

  async getUserVaultBalance(
    contractId: string,
    userPublicKey: string,
  ): Promise<number> {
    try {
      const nativeValue = await this.invokeContractRead(
        contractId,
        'balanceOf',
        [new Address(userPublicKey).toScVal()],
        userPublicKey,
      );

      return this.normalizeContractBalance(nativeValue);
    } catch (error) {
      this.logger.warn(
        `Could not fetch vault balance from ${contractId} for ${userPublicKey}: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  /**
   * Fetch wallet balance from Stellar
   * @param publicKey The user's Stellar public key
   * @param asset Optional asset code to filter by (defaults to native XLM)
   * @returns Balance in stroops (smallest unit)
   */
  async getWalletBalance(
    publicKey: string,
    asset: string = 'native',
  ): Promise<number> {
    try {
      const horizonServer = this.stellarService.getHorizonServer();
      const account = await horizonServer
        .accounts()
        .accountId(publicKey)
        .call();

      if (asset === 'native') {
        // Return native balance in stroops (1 XLM = 10,000,000 stroops)
        return Math.floor(parseFloat(account.balances[0].balance) * 10_000_000);
      }

      // Find specific asset balance
      const assetBalance = account.balances.find(
        (balance) => 'asset_code' in balance && balance.asset_code === asset,
      );

      if (assetBalance && 'balance' in assetBalance) {
        return Math.floor(parseFloat(assetBalance.balance) * 10_000_000);
      }

      return 0;
    } catch (error) {
      this.logger.warn(
        `Could not fetch wallet balance for ${publicKey}: ${error.message}`,
      );
      return 0;
    }
  }

  private normalizeContractBalance(value: unknown): number {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }
}
