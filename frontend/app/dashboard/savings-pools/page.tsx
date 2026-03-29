"use client";

import React, { useState, useMemo } from "react";
import { Landmark, Search, ChevronDown, LayoutGrid, List } from "lucide-react";
import SavingsPoolCard, {
  type SavingsPool,
} from "@/app/components/dashboard/SavingsPoolCard";

export default function GoalBasedSavingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  // Savings pools data
  const savingsPools: SavingsPool[] = [
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

  // Filter pools based on search query
  const filteredPools = useMemo(() => {
    if (!searchQuery.trim()) {
      return savingsPools;
    }

    const query = searchQuery.toLowerCase();
    return savingsPools.filter(
      (pool) =>
        pool.name.toLowerCase().includes(query) ||
        pool.strategy.toLowerCase().includes(query) ||
        pool.riskLevel.toLowerCase().includes(query),
    );
  }, [searchQuery, savingsPools]);

  const handleDeposit = (poolId: string) => {
    console.log(`Deposit clicked for pool: ${poolId}`);
    // Add your deposit logic here
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-b from-[#063d3d] to-[#0a6f6f] flex items-center justify-center text-cyan-400 shadow-[0_8px_20px_rgba(6,61,61,0.3)]">
            <Landmark size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white m-0 tracking-tight">
              Savings Pools
            </h1>
            <p className="text-[#5e8c96] text-sm md:text-base m-0 mt-1">
              Discover and manage savings pools across supported assets.
            </p>
          </div>
        </div>

        {/* View Toggles & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex bg-[#0e2330] p-1 rounded-xl border border-white/5">
            <button className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shadow-sm">
              <LayoutGrid size={18} />
            </button>
            <button className="p-2 rounded-lg text-[#5e8c96] hover:text-white transition-colors">
              <List size={18} />
            </button>
          </div>
          <button className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#061a1a] font-bold rounded-xl transition-all shadow-lg active:scale-95">
            Create New Goal
          </button>
        </div>
      </div>

      {/* Search & Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="relative flex-1 min-w-[300px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pools by name, strategy, or risk level..."
            className="w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: "Asset: All", active: true },
            { label: "Risk: All Levels", active: false },
            { label: "Sort by: APY", active: false },
          ].map((filter, i) => (
            <button
              key={i}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                filter.active
                  ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-400"
                  : "bg-[#0e2330] border-white/5 text-[#5e8c96] hover:border-white/10 hover:text-white"
              }`}
            >
              <span className="text-sm font-medium">{filter.label}</span>
              <ChevronDown size={14} opacity={0.7} />
            </button>
          ))}
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white m-0">Available Pools</h3>
        <span className="text-[#5e8c96] text-sm">
          {filteredPools.length === savingsPools.length
            ? `Showing ${filteredPools.length} pools`
            : `Found ${filteredPools.length} of ${savingsPools.length} pools`}
        </span>
      </div>

      {/* Pools Grid */}
      {filteredPools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPools.map((pool) => (
            <SavingsPoolCard
              key={pool.id}
              pool={pool}
              onDeposit={handleDeposit}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Search size={32} className="text-[#5e8c96]" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No pools found
          </h3>
          <p className="text-[#5e8c96] max-w-md">
            Try adjusting your search terms or filters to find what you're
            looking for.
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-6 px-6 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl font-medium hover:bg-cyan-500/20 transition-all"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}
