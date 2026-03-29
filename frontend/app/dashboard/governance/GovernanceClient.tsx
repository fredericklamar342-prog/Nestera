"use client";

import { useState } from "react";
import { ShieldCheck, Users, Vote, FileText, XCircle } from "lucide-react";
import PassedProposalCard, {
  type PassedProposal,
} from "@/app/components/dashboard/PassedProposalCard";
import ProposalCard from "@/app/components/dashboard/ProposalCard";

export default function GovernanceClient() {
  const [activeTab, setActiveTab] = useState("Overview");
  const tabs = [
    { label: "Overview", icon: FileText },
    { label: "Active Votes", icon: Vote },
    { label: "Rejected", icon: XCircle },
    { label: "Delegations", icon: Users },
  ];

  const passedProposals: PassedProposal[] = [
    {
      id: "p-001",
      title: "Reduce protocol fees for small deposits",
      category: "Parameters",
      passedOn: "Mar 18, 2026",
      forVotes: 1824,
      againstVotes: 312,
    },
    {
      id: "p-002",
      title: "Add USDT (testnet) as a supported stablecoin",
      category: "Assets",
      passedOn: "Feb 27, 2026",
      forVotes: 1490,
      againstVotes: 410,
    },
    {
      id: "p-003",
      title: "Increase timelock delay to 24 hours",
      category: "Security",
      passedOn: "Jan 30, 2026",
      forVotes: 2055,
      againstVotes: 155,
    },
  ];
  const activeProposals = [
    {
      id: "NIP-4",
      title: "Increase USDC Base Yield to 14%",
      categories: ["Finance"],
      countdownText: "Ends in 2 days",
      forPercent: 75,
      againstPercent: 25,
      status: "ACTIVE",
    },
    {
      id: "NIP-12",
      title: "Add new ecosystem grants program",
      categories: ["Ecosystem", "Finance"],
      countdownText: "Ends in 6 days",
      forPercent: 52,
      againstPercent: 48,
      status: "ACTIVE",
    },
  ];
  const rejectedProposals = [
    {
      id: "NIP-1",
      title: "Increase Treasury Risk Exposure",
      categories: ["Treasury"],
      countdownText: "Ended Mar 10, 2026",
      forPercent: 34,
      againstPercent: 66,
      status: "REJECTED",
    },
    {
      id: "NIP-6",
      title: "Remove XLM Staking Incentives",
      categories: ["Staking"],
      countdownText: "Ended Feb 19, 2026",
      forPercent: 41,
      againstPercent: 59,
      status: "REJECTED",
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-b from-[#063d3d] to-[#0a6f6f] flex items-center justify-center text-[#5de0e0]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white m-0">Governance</h1>
            <p className="text-[#5e8c96] text-sm m-0">
              Vote on proposals and protocol decisions
            </p>
          </div>
        </div>

        <div className="w-full lg:max-w-sm rounded-2xl border border-cyan-400/10 bg-[linear-gradient(180deg,rgba(6,18,20,0.55),rgba(6,18,20,0.35))] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[#4fa9b1] m-0">
              Voting Power
            </p>
            <span className="text-[11px] px-2 py-1 rounded-lg bg-cyan-400/10 text-cyan-300">
              Connected
            </span>
          </div>
          <p className="text-3xl font-extrabold text-white leading-none m-0">
            12,480
          </p>
          <p className="text-[#73c0c8] text-xs mt-2 mb-4">
            NSTR delegated to your wallet
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
              <p className="text-[#5e8c96] m-0">Available</p>
              <p className="text-[#dff] font-semibold mt-1 mb-0">9,120</p>
            </div>
            <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
              <p className="text-[#5e8c96] m-0">Locked</p>
              <p className="text-[#dff] font-semibold mt-1 mb-0">3,360</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/6 bg-[#0d2530] p-1.5">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                type="button"
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === tab.label
                    ? "bg-cyan-500/12 text-cyan-300"
                    : "text-[#6b99a3] hover:text-white hover:bg-white/5"
                }`}
              >
                <TabIcon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="bg-linear-to-b from-[rgba(6,18,20,0.45)] to-[rgba(4,12,14,0.35)] border border-[rgba(8,120,120,0.06)] rounded-2xl p-[18px] text-[#dff]">
        {activeTab === "Overview" && (
          <>
            <div className="w-10 h-10 rounded-xl bg-linear-to-b from-[#063d3d] to-[#0a6f6f] flex items-center justify-center text-[#5de0e0]">
              <ShieldCheck size={18} />
            </div>
            <div className="flex justify-between items-center mb-3 mt-4">
              <h4 className="m-0 text-base font-semibold">Passed Proposals</h4>
              <a
                href="#"
                className="text-[#60f0ec] no-underline font-semibold hover:text-[#9ef0f0] transition-colors"
              >
                View all
              </a>
            </div>
          </>
        )}

        {(activeTab === "Overview" || activeTab === "Active Votes") && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 mt-4">
              <h4 className="m-0 text-base font-semibold">Active Proposals</h4>
              <a
                href="#"
                className="text-[#60f0ec] no-underline font-semibold hover:text-[#9ef0f0] transition-colors"
              >
                View all
              </a>
            </div>

            <div className="space-y-4">
              {activeProposals.map((proposal) => (
                <ProposalCard key={proposal.id} {...proposal} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "Rejected" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 mt-4">
              <h4 className="m-0 text-base font-semibold">Rejected Proposals</h4>
              <a
                href="#"
                className="text-[#60f0ec] no-underline font-semibold hover:text-[#9ef0f0] transition-colors"
              >
                View all
              </a>
            </div>

            <div className="space-y-4">
              {rejectedProposals.map((proposal) => (
                <ProposalCard key={proposal.id} {...proposal} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "Overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {passedProposals.map((proposal) => (
              <PassedProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
