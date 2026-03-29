"use client";

import React from "react";
import { Copy, FileCode, Calendar } from "lucide-react";

export type RiskLevel = "Low Risk" | "Medium Risk" | "High Risk";

export interface ContractDetails {
  contractId: string;
  buyerAddress: string;
  sellerAddress: string;
  mediatorAddress?: string;
  lossRatio: {
    buyer: number;
    seller: number;
  };
  createdAt: Date | string;
  tvl?: string;
  riskLevel?: RiskLevel;
}

interface ContractDetailsCardProps {
  contract: ContractDetails;
  onCopyContractId?: (contractId: string) => void;
}

/**
 * ContractDetailsCard
 * 
 * Displays Soroban smart contract details for the active escrow.
 * Shows contract ID, parties, loss ratio, and creation date.
 * 
 * Features:
 * - Truncated contract ID with copy button
 * - Party addresses (buyer, seller, mediator)
 * - Visual loss ratio split bar
 * - Creation timestamp
 * - Risk level indicator
 */
const ContractDetailsCard: React.FC<ContractDetailsCardProps> = ({
  contract,
  onCopyContractId,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyContractId = () => {
    navigator.clipboard.writeText(contract.contractId);
    setCopied(true);
    onCopyContractId?.(contract.contractId);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (address: string, chars = 6) => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRiskColor = (risk?: RiskLevel) => {
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

  const getRiskDotColor = (risk?: RiskLevel) => {
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

  return (
    <div className="bg-gradient-to-br from-[#0a1f1f] to-[#061515] rounded-2xl border border-white/5 p-6 hover:border-cyan-500/20 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(6,182,212,0.1)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileCode className="w-5 h-5 text-cyan-400" />
        <h2 className="text-white font-bold text-lg m-0">Agreement Protocol</h2>
      </div>

      {/* Contract ID Section */}
      <div className="mb-6 pb-6 border-b border-white/5">
        <div className="text-[#5e8c96] text-xs uppercase tracking-wide mb-2">
          Contract ID
        </div>
        <div className="flex items-center gap-2">
          <code className="text-cyan-400 font-mono text-sm flex-1 truncate">
            {truncateAddress(contract.contractId, 8)}
          </code>
          <button
            onClick={handleCopyContractId}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors duration-200"
            title="Copy contract ID"
          >
            <Copy
              className={`w-4 h-4 transition-colors duration-200 ${
                copied ? "text-emerald-400" : "text-[#7a9fa9]"
              }`}
            />
          </button>
        </div>
        {copied && (
          <p className="text-emerald-400 text-xs mt-2">Copied to clipboard</p>
        )}
      </div>

      {/* Parties Section */}
      <div className="mb-6 pb-6 border-b border-white/5">
        <div className="text-[#5e8c96] text-xs uppercase tracking-wide mb-3">
          Parties
        </div>
        <div className="space-y-3">
          {/* Buyer */}
          <div className="flex items-center justify-between py-2">
            <span className="text-[#7a9fa9] text-sm">Buyer</span>
            <code className="text-white font-mono text-sm">
              {truncateAddress(contract.buyerAddress)}
            </code>
          </div>

          {/* Seller */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-[#7a9fa9] text-sm">Seller</span>
            <code className="text-white font-mono text-sm">
              {truncateAddress(contract.sellerAddress)}
            </code>
          </div>

          {/* Mediator (if present) */}
          {contract.mediatorAddress && (
            <div className="flex items-center justify-between py-2">
              <span className="text-[#7a9fa9] text-sm">Mediator</span>
              <code className="text-white font-mono text-sm">
                {truncateAddress(contract.mediatorAddress)}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Loss Ratio Section */}
      <div className="mb-6 pb-6 border-b border-white/5">
        <div className="text-[#5e8c96] text-xs uppercase tracking-wide mb-3">
          Loss Ratio
        </div>
        <div className="space-y-2">
          {/* Ratio Display */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-semibold">
              {contract.lossRatio.buyer}% / {contract.lossRatio.seller}%
            </span>
          </div>

          {/* Visual Split Bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
            {/* Buyer portion */}
            <div
              className="bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${contract.lossRatio.buyer}%` }}
              title={`Buyer: ${contract.lossRatio.buyer}%`}
            />
            {/* Seller portion */}
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
              style={{ width: `${contract.lossRatio.seller}%` }}
              title={`Seller: ${contract.lossRatio.seller}%`}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-xs mt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[#7a9fa9]">Buyer Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[#7a9fa9]">Seller Risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="space-y-3">
        {/* Created At */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7a9fa9]" />
            <span className="text-[#7a9fa9] text-sm">Created</span>
          </div>
          <span className="text-white text-sm">{formatDate(contract.createdAt)}</span>
        </div>

        {/* TVL (if present) */}
        {contract.tvl && (
          <div className="flex items-center justify-between py-2 border-t border-white/5 pt-3">
            <span className="text-[#7a9fa9] text-sm">Total Value Locked</span>
            <span className="text-cyan-400 font-semibold">{contract.tvl}</span>
          </div>
        )}

        {/* Risk Level (if present) */}
        {contract.riskLevel && (
          <div className="flex items-center justify-between py-2">
            <span className="text-[#7a9fa9] text-sm">Risk Level</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${getRiskDotColor(
                  contract.riskLevel
                )}`}
              />
              <span className={`text-sm font-medium ${getRiskColor(contract.riskLevel)}`}>
                {contract.riskLevel}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractDetailsCard;
