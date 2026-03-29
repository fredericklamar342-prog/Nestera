'use client';

import React, { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';

export type GoalStatus = 'active' | 'near-deadline' | 'behind-schedule' | 'paused';

interface GoalCardProps {
  icon: ReactNode;
  title: string;
  status: GoalStatus;
  targetAmount: string;
  currentSaved: string;
  remainingAmount: string;
  progressPercent: number;
  scheduleLabel: string;
  contributionFrequency: string;
  nextContributionLabel: string;
  nextContributionValue: string;
  onAddFunds?: () => void;
  onViewDetails?: () => void;
  onOverflowAction?: () => void;
}

const statusStyles: Record<GoalStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
  },
  'near-deadline': {
    label: 'Near Deadline',
    className: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
  },
  'behind-schedule': {
    label: 'Behind Schedule',
    className: 'bg-rose-500/15 border-rose-400/30 text-rose-200',
  },
  paused: {
    label: 'Paused',
    className: 'bg-slate-600/20 border-slate-500/30 text-slate-200',
  },
};

const progressBarColor: Record<GoalStatus, string> = {
  active: 'bg-emerald-400',
  'near-deadline': 'bg-amber-400',
  'behind-schedule': 'bg-rose-400',
  paused: 'bg-slate-400',
};

export default function GoalCard({
  icon,
  title,
  status,
  targetAmount,
  currentSaved,
  remainingAmount,
  progressPercent,
  scheduleLabel,
  contributionFrequency,
  nextContributionLabel,
  nextContributionValue,
  onAddFunds,
  onViewDetails,
  onOverflowAction,
}: GoalCardProps) {
  const safeProgress = Math.max(0, Math.min(100, progressPercent));
  const statusInfo = statusStyles[status];

  return (
    <article className="rounded-2xl border border-white/10 bg-[#0d2425] p-5 shadow-[0_12px_30px_rgba(2,12,12,0.45)]">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#0f3b3a] flex items-center justify-center text-cyan-300">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white leading-snug">{title}</h3>
          <div className={`inline-flex items-center gap-2 px-2 py-1 mt-2 rounded-full border text-xs font-medium ${statusInfo.className}`}>
            <span>{statusInfo.label}</span>
          </div>
        </div>
        <button
          onClick={onOverflowAction}
          aria-label="More actions"
          className="text-slate-400 hover:text-white transition"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
        <div>
          <p className="text-[#6a8a93] text-[11px] uppercase tracking-wider">Target</p>
          <p className="text-white font-semibold">{targetAmount}</p>
        </div>
        <div>
          <p className="text-[#6a8a93] text-[11px] uppercase tracking-wider">Saved</p>
          <p className="text-white font-semibold">{currentSaved}</p>
        </div>
        <div>
          <p className="text-[#6a8a93] text-[11px] uppercase tracking-wider">Remaining</p>
          <p className="text-white font-semibold">{remainingAmount}</p>
        </div>
        <div>
          <p className="text-[#6a8a93] text-[11px] uppercase tracking-wider">Schedule</p>
          <p className="text-white font-semibold">{scheduleLabel}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full ${progressBarColor[status]}`}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-300">Progress: <span className="text-white font-semibold">{safeProgress}%</span></p>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[#6a8a93] text-[11px] uppercase tracking-wider">Frequency</p>
          <p className="text-white font-semibold">{contributionFrequency}</p>
        </div>
        <div>
          <p className="text-[#6a8a93] text-[11px] uppercase tracking-wider">{nextContributionLabel}</p>
          <p className="text-white font-semibold">{nextContributionValue}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={onAddFunds}
          className="flex-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#061a1a] font-semibold px-3 py-2 transition-all active:scale-95"
        >
          Add Funds
        </button>
        <button
          onClick={onViewDetails}
          className="flex-1 rounded-lg border border-white/20 text-white hover:bg-white/5 px-3 py-2 transition-all active:scale-95"
        >
          View Details
        </button>
      </div>
    </article>
  );
}
