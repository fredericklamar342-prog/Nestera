'use client';

import React from "react";
import Link from "next/link";
import {
  LayoutGrid,
  CheckCircle2,
  Trophy,
  Banknote,
  ArrowUp,
  PiggyBank,
  Home,
  Airplay,
  ShoppingBag,
} from "lucide-react";
import GoalCard, { GoalStatus } from "./components/GoalCard";

// export const metadata = { title: "Goal-Based Savings - Nestera" };

export default function GoalBasedSavingsPage() {
  return (
    <section className="min-h-screen w-full bg-[#0b1f20]">
      {/* Header Band */}
      <div className="w-full bg-[#0f2a2a]">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-8 pt-10 pb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white m-0 tracking-tight">
                Goal-Based Savings
              </h1>
              <p className="text-[#6a8a93] text-sm md:text-base m-0 mt-3 max-w-3xl">
                Create savings targets, track progress, and stay on course toward
                your personal financial goals
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-5 py-2.5 rounded-xl border border-cyan-400/40 text-cyan-200 hover:text-white hover:border-cyan-300 transition-colors">
                View Templates
              </button>
              <Link
                href="/savings/create-goal"
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#061a1a] font-semibold rounded-xl transition-all shadow-lg active:scale-95 inline-block"
              >
                Create New Goal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            {
              label: "Total Goals",
              value: "12",
              icon: LayoutGrid,
              color: "text-cyan-400",
            },
            {
              label: "Active Goals",
              value: "8",
              icon: CheckCircle2,
              color: "text-emerald-400",
            },
            {
              label: "Total Saved",
              value: "$43,250",
              icon: Banknote,
              color: "text-cyan-400",
            },
            {
              label: "Goals Completed",
              value: "4",
              icon: Trophy,
              color: "text-amber-400",
            },
            {
              label: "This Month's Contributions",
              value: "$1,840",
              icon: ArrowUp,
              color: "text-cyan-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/5 bg-[#0f2c2c] p-6 shadow-[0_10px_24px_rgba(2,12,12,0.35)]"
            >
              <div className={stat.color}>
                <stat.icon size={20} strokeWidth={2} />
              </div>
              <p className="text-[#6a8a93] text-xs mt-3 mb-2">{stat.label}</p>
              <p className="text-white text-2xl font-semibold m-0">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Goal cards grid */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 pb-16">
        <h2 className="text-xl md:text-2xl text-white font-bold mb-5">Your Savings Goals</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[
            {
              id: '1',
              icon: <PiggyBank size={20} />,
              title: 'Emergency Fund',
              status: 'active' as GoalStatus,
              targetAmount: '$12,000',
              currentSaved: '$6,400',
              remainingAmount: '$5,600',
              progressPercent: 53,
              scheduleLabel: 'By Dec 20, 2026',
              contributionFrequency: 'Weekly',
              nextContributionLabel: 'Next contribution',
              nextContributionValue: '$150 on Jun 28',
            },
            {
              id: '2',
              icon: <Home size={20} />,
              title: 'Down Payment',
              status: 'near-deadline' as GoalStatus,
              targetAmount: '$40,000',
              currentSaved: '$28,000',
              remainingAmount: '$12,000',
              progressPercent: 70,
              scheduleLabel: 'Due Oct 03, 2026',
              contributionFrequency: 'Monthly',
              nextContributionLabel: 'Next contribution',
              nextContributionValue: '$1,000 on Jul 01',
            },
            {
              id: '3',
              icon: <Airplay size={20} />,
              title: 'Summer Trip',
              status: 'behind-schedule' as GoalStatus,
              targetAmount: '$8,000',
              currentSaved: '$3,100',
              remainingAmount: '$4,900',
              progressPercent: 39,
              scheduleLabel: 'By Aug 15, 2026',
              contributionFrequency: 'Every other week',
              nextContributionLabel: 'Next contribution',
              nextContributionValue: '$250 on Jul 05',
            },
            {
              id: '4',
              icon: <ShoppingBag size={20} />,
              title: 'New Laptop',
              status: 'paused' as GoalStatus,
              targetAmount: '$2,500',
              currentSaved: '$1,500',
              remainingAmount: '$1,000',
              progressPercent: 60,
              scheduleLabel: 'Paused until decision',
              contributionFrequency: 'Paused',
              nextContributionLabel: 'Next contribution',
              nextContributionValue: 'N/A',
            },
          ].map((goal) => (
            <GoalCard
              key={goal.id}
              icon={goal.icon}
              title={goal.title}
              status={goal.status}
              targetAmount={goal.targetAmount}
              currentSaved={goal.currentSaved}
              remainingAmount={goal.remainingAmount}
              progressPercent={goal.progressPercent}
              scheduleLabel={goal.scheduleLabel}
              contributionFrequency={goal.contributionFrequency}
              nextContributionLabel={goal.nextContributionLabel}
              nextContributionValue={goal.nextContributionValue}
              onAddFunds={() => console.log('Add funds', goal.id)}
              onViewDetails={() => console.log('View details', goal.id)}
              onOverflowAction={() => console.log('More actions', goal.id)}
            />
          ))}
        </div>
      </div>

      {/* Insights / Smart Recommendations Panel */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="rounded-2xl border border-white/10 bg-[#0f2c2c] p-6 shadow-[0_12px_30px_rgba(2,12,12,0.45)]">
          <h3 className="text-lg font-semibold text-white mb-4">Smart Insights</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-400/20">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                ⚠️
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Emergency Fund Goal Behind Schedule</p>
                <p className="text-[#6a8a93] text-xs mt-1">You're 15% behind your target. Consider increasing contributions.</p>
                <a href="#" className="text-cyan-400 text-xs hover:text-cyan-300 mt-2 inline-block">Contribute Now →</a>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                🎉
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Great Progress on Travel Fund</p>
                <p className="text-[#6a8a93] text-xs mt-1">You've saved 70% of your goal. Keep it up!</p>
                <a href="#" className="text-cyan-400 text-xs hover:text-cyan-300 mt-2 inline-block">View Progress →</a>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-cyan-500/10 border border-cyan-400/20">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                💡
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Yield Optimization Available</p>
                <p className="text-[#6a8a93] text-xs mt-1">Switch to higher-yield options for better returns.</p>
                <a href="#" className="text-cyan-400 text-xs hover:text-cyan-300 mt-2 inline-block">Learn More →</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Contributions Table */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Recent Contributions</h3>
          <a href="#" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">View All →</a>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0f2c2c] overflow-hidden shadow-[0_12px_30px_rgba(2,12,12,0.45)]">
          <div className="grid grid-cols-5 px-6 py-3 border-b border-white/10 text-[#6a8a93] text-xs font-bold uppercase tracking-widest">
            <div>Date</div>
            <div>Goal Name</div>
            <div>Type</div>
            <div>Amount</div>
            <div>Status</div>
          </div>
          {[
            {
              date: "2026-03-25",
              goalName: "Emergency Fund",
              type: "Auto",
              amount: "+$150.00",
              status: "Completed",
              statusStyle: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
            },
            {
              date: "2026-03-24",
              goalName: "Travel Fund",
              type: "Manual",
              amount: "+$200.00",
              status: "Completed",
              statusStyle: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
            },
            {
              date: "2026-03-23",
              goalName: "New Laptop",
              type: "Auto",
              amount: "+$75.00",
              status: "Pending",
              statusStyle: "bg-amber-500/15 border-amber-400/30 text-amber-200",
            },
            {
              date: "2026-03-22",
              goalName: "Car Fund",
              type: "Manual",
              amount: "+$300.00",
              status: "Completed",
              statusStyle: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
            },
            {
              date: "2026-03-21",
              goalName: "Education Fund",
              type: "Auto",
              amount: "+$100.00",
              status: "Completed",
              statusStyle: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
            },
          ].map((contribution, index) => (
            <div
              key={index}
              className="grid grid-cols-5 px-6 py-4 border-b border-white/10 last:border-0 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <div className="text-[#b1d7da]">{contribution.date}</div>
              <div className="text-white font-medium">{contribution.goalName}</div>
              <div className="text-[#6faab0]">{contribution.type}</div>
              <div className="text-emerald-300 font-semibold">{contribution.amount}</div>
              <div className="text-right">
                <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full border ${contribution.statusStyle}`}>
                  {contribution.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}