"use client";

import React from "react";

export type RiskLevel = "Low Risk" | "Medium Risk" | "High Risk";

export interface SavingsPool {
  id: string;
  name: string;
  strategy: string;
  icon?: string;
  iconBgColor?: string;
  apy: number;
  tvl: string;
  riskLevel: RiskLevel;
}

interface SavingsPoolCardProps {
  pool: SavingsPool;
  onDeposit?: (poolId: string) => void;
}

const SavingsPoolCard: React.FC<SavingsPoolCardProps> = ({
  pool,
  onDeposit,
}) => {
  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case "Low Risk":
        return "text-emerald-400";
      case "Medium Risk":
        return "text-amber-400";
      case "High Risk":
        return "text-rose-400";
      default:
        return "text-gray-400";
    }
  };

  const getRiskDotColor = (risk: RiskLevel) => {
    switch (risk) {
      case "Low Risk":
        return "bg-emerald-400";
      case "Medium Risk":
        return "bg-amber-400";
      case "High Risk":
        return "bg-rose-400";
      default:
        return "bg-gray-400";
    }
  };

  const getInitials = (name: string) => {
    const words = name.split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-gradient-to-br from-[#0a1f1f] to-[#061515] rounded-2xl border border-white/5 p-6 hover:border-cyan-500/20 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(6,182,212,0.1)] group">
      {/* Header with Icon and Title */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 ${
            pool.iconBgColor || "bg-gradient-to-br from-cyan-500 to-cyan-600"
          }`}
        >
          {pool.icon || getInitials(pool.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg m-0 truncate">
            {pool.name}
          </h3>
          <p className="text-[#7a9fa9] text-sm m-0 mt-1">{pool.strategy}</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-[#5e8c96] text-xs uppercase tracking-wide mb-2">
            APY
          </div>
          <div className="text-cyan-400 text-2xl font-bold">
            {pool.apy.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[#5e8c96] text-xs uppercase tracking-wide mb-2">
            TVL
          </div>
          <div className="text-white text-2xl font-bold">{pool.tvl}</div>
        </div>
      </div>

      {/* Risk Badge */}
      <div className="flex items-center gap-2 mb-6">
        <div
          className={`w-2 h-2 rounded-full ${getRiskDotColor(pool.riskLevel)}`}
        />
        <span className={`text-sm font-medium ${getRiskColor(pool.riskLevel)}`}>
          {pool.riskLevel}
        </span>
      </div>

      {/* Deposit Button */}
      <button
        onClick={() => onDeposit?.(pool.id)}
        className="w-full py-3 bg-transparent border border-cyan-500/30 text-cyan-400 rounded-xl font-semibold hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all duration-200 active:scale-[0.98] group-hover:border-cyan-500/50"
      >
        Deposit
      </button>
    </div>
  );
};

export default SavingsPoolCard;
