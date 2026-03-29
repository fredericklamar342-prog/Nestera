"use client";

import React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";

export interface PassedProposal {
  id: string;
  title: string;
  category: string;
  passedOn: string;
  forVotes: number;
  againstVotes: number;
}

export default function PassedProposalCard({ proposal }: { proposal: PassedProposal }) {
  const total = proposal.forVotes + proposal.againstVotes;
  const pct = total <= 0 ? 0 : Math.round((proposal.forVotes / total) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[rgba(3,12,14,0.12)] p-5">
      <div className="absolute top-0 left-0 w-1 h-16 bg-cyan-500/70 rounded-br-full" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-linear-to-b from-[#063d3d] to-[#0a6f6f] flex items-center justify-center text-[#dff] shrink-0">
            <CheckCircle2 size={20} className="text-[#8ef4ef]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="m-0 text-base font-bold text-[#dff] truncate">
                {proposal.title}
              </h4>
              <span className="px-2 py-0.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                {proposal.category}
              </span>
            </div>
            <p className="text-[#90b4b4] text-xs m-0 mt-2">
              Passed on {proposal.passedOn}
            </p>
          </div>
        </div>

        <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            Passed
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] text-[#91b6b6] uppercase tracking-widest font-bold">
              Approval
            </div>
            <div className="mt-1 font-bold text-[#dff]">{pct}% For</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[#91b6b6] uppercase tracking-widest font-bold">
              Votes
            </div>
            <div className="mt-1 text-sm font-bold text-[#dff]">
              {proposal.forVotes} / {proposal.againstVotes}
            </div>
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-linear-to-r from-emerald-400 to-cyan-400"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#061a1a] font-bold transition-all active:scale-95">
            View details
          </button>
          <a
            href="#"
            className="inline-flex items-center gap-1 text-[#60f0ec] font-semibold hover:text-[#9ef0f0] transition-colors group"
          >
            See proposal
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

