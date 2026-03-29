/**
 * Example usage of SavingsPoolCard component
 *
 * This file demonstrates how to use the SavingsPoolCard component
 * in your Savings Pools page or any other page.
 */

import React from "react";
import SavingsPoolCard, { type SavingsPool } from "./SavingsPoolCard";

export default function SavingsPoolCardExample() {
  // Example pool data
  const examplePools: SavingsPool[] = [
    {
      id: "usdc-flexible",
      name: "USDC Flexible",
      strategy: "Stablecoin",
      icon: "$",
      iconBgColor: "bg-gradient-to-br from-blue-500 to-blue-600",
      apy: 5.4,
      tvl: "$24.5M",
      riskLevel: "Low Risk",
    },
    {
      id: "xlm-staking",
      name: "XLM Staking",
      strategy: "Native",
      icon: "✦",
      iconBgColor: "bg-gradient-to-br from-purple-500 to-purple-600",
      apy: 4.5,
      tvl: "$12.8M",
      riskLevel: "Medium Risk",
    },
    {
      id: "aqua-farming",
      name: "AQUA Farming",
      strategy: "DeFi",
      icon: "A",
      iconBgColor: "bg-gradient-to-br from-cyan-500 to-cyan-600",
      apy: 18.5,
      tvl: "$2.1M",
      riskLevel: "High Risk",
    },
    {
      id: "eurc-yield",
      name: "EURC Yield",
      strategy: "Euro Stable",
      icon: "€",
      iconBgColor: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      apy: 3.2,
      tvl: "$8.4M",
      riskLevel: "Low Risk",
    },
    {
      id: "yusdc-vault",
      name: "yUSDC Vault",
      strategy: "Yield Aggregator",
      icon: "y",
      iconBgColor: "bg-gradient-to-br from-teal-500 to-teal-600",
      apy: 8.1,
      tvl: "$4.2M",
      riskLevel: "Medium Risk",
    },
    {
      id: "btc-xlm-lp",
      name: "BTC-XLM LP",
      strategy: "Liquidity Pool",
      icon: "₿",
      iconBgColor: "bg-gradient-to-br from-orange-500 to-orange-600",
      apy: 12.4,
      tvl: "$5.6M",
      riskLevel: "High Risk",
    },
  ];

  const handleDeposit = (poolId: string) => {
    console.log(`Deposit clicked for pool: ${poolId}`);
    // Add your deposit logic here
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-6">
        Available Savings Pools
      </h2>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {examplePools.map((pool) => (
          <SavingsPoolCard
            key={pool.id}
            pool={pool}
            onDeposit={handleDeposit}
          />
        ))}
      </div>
    </div>
  );
}
