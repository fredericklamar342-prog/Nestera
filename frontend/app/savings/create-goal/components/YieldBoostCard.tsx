"use client";

import React from "react";
import { Sparkles, ArrowUpRight } from "lucide-react";

export default function YieldBoostCard() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 -mt-6 mb-8">
      <div className="rounded-2xl border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(0,217,192,0.12),rgba(12,36,48,0.55))] p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/15 text-cyan-300 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/90 m-0">
                Yield Boost
              </p>
              <h3 className="text-white text-lg md:text-xl font-bold mt-1 mb-1">
                Boost this goal with up to +2.4% APY
              </h3>
              <p className="text-[#8fbfc4] text-sm m-0">
                Enable smart allocation to route idle balances into low-risk
                pools while preserving withdrawal flexibility.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 text-[#062526] font-bold hover:bg-cyan-300 transition-colors"
          >
            Enable boost
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
