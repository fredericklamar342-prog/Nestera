import React from "react";
import { MoreHorizontal, PieChart } from "lucide-react";
import PortfolioPerformanceChart from "./PortfolioPerformanceChart";

export const metadata = { title: "Analytics – Nestera" };

export default function AnalyticsPage() {
  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-linear-to-b from-[#063d3d] to-[#0a6f6f] flex items-center justify-center text-[#5de0e0]">
          <PieChart size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white m-0">Analytics</h1>
          <p className="text-[#5e8c96] text-sm m-0">
            Portfolio performance and insights
          </p>
        </div>
      </div>

      <PortfolioPerformanceChart />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <article className="rounded-2xl border border-[rgba(8,120,120,0.06)] bg-linear-to-b from-[rgba(6,18,20,0.45)] to-[rgba(4,12,14,0.35)] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white m-0">Asset Allocation</h3>
            <button
              type="button"
              className="text-[#7caeb6] hover:text-cyan-300 transition-colors"
              aria-label="Asset allocation options"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="flex items-center justify-center mt-6 mb-5">
            <div className="relative w-44 h-44 rounded-full bg-[conic-gradient(#22d3ee_0_40%,#60a5fa_40%_75%,#a78bfa_75%_100%)] flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-[#081a20] border border-white/5 flex flex-col items-center justify-center">
                <span className="text-xs uppercase tracking-widest text-[#79a9b0]">
                  Assets
                </span>
                <span className="text-3xl font-bold text-white leading-none">3</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { asset: "USDC", percent: 40, color: "bg-cyan-400" },
              { asset: "XLM", percent: 35, color: "bg-blue-400" },
              { asset: "ETH", percent: 25, color: "bg-violet-400" },
            ].map((item) => (
              <div key={item.asset} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-[#d8f3f6]">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  {item.asset}
                </div>
                <span className="text-[#8cc0c7] font-semibold">{item.percent}%</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[rgba(8,120,120,0.06)] bg-linear-to-b from-[rgba(6,18,20,0.45)] to-[rgba(4,12,14,0.35)] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white m-0">Yield Breakdown</h3>
            <span className="px-2.5 py-1 rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              APY High
            </span>
          </div>
          <p className="text-[#6e9ba2] text-sm mt-2 mb-0">
            Earnings from your active pools
          </p>

          <div className="mt-5 p-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#6e9ba2] m-0">
              Total Interest Earned
            </p>
            <p className="text-3xl font-bold text-white m-0 mt-1">$743.20</p>
          </div>

          <div className="space-y-4 mt-5">
            {[
              { label: "XLM Staking", amount: "+$420.50", progress: 57 },
              { label: "USDC Flexible", amount: "+$322.70", progress: 43 },
            ].map((pool) => (
              <div key={pool.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#d8f3f6]">{pool.label}</span>
                  <span className="text-sm font-semibold text-emerald-300">{pool.amount}</span>
                </div>
                <div className="h-2 rounded-full bg-[#0d2530] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-cyan-400 to-emerald-300"
                    style={{ width: `${pool.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}