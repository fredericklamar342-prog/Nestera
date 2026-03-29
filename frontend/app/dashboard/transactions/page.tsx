"use client";

import React from "react";
import { Download, History, Search, ChevronDown } from "lucide-react";
import TransactionRow, { TransactionType, TransactionStatus } from "./components/TransactionRow";

type TransactionRowData = {
  date: string;
  time: string;
  transactionId: string;
  type: TransactionType;
  assetDetails: string;
  amountDisplay: string;
  isPositive: boolean | null;
  status: TransactionStatus;
  hash: string;
};

function csvEscape(value: string) {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replaceAll('"', '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toCsv(rows: TransactionRowData[]) {
  const header = ["date", "time", "transactionId", "type", "assetDetails", "amountDisplay", "status", "hash"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.date, r.time, r.transactionId, r.type, r.assetDetails, r.amountDisplay, r.status, r.hash]
        .map(csvEscape)
        .join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function downloadTextFile(
  filename: string,
  text: string,
  mime = "text/csv;charset=utf-8",
) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function TransactionHistoryPage() {
  const transactions: TransactionRowData[] = [
    {
      date: "Oct 25, 2023",
      time: "10:23 AM",
      transactionId: "0xabc...123",
      type: "deposit",
      assetDetails: "USDC",
      amountDisplay: "+$500.00",
      isPositive: true,
      status: "completed",
      hash: "0xabc",
    },
    {
      date: "Oct 24, 2023",
      time: "04:15 PM",
      transactionId: "0xdef...456",
      type: "withdraw",
      assetDetails: "ETH",
      amountDisplay: "-0.50 ETH",
      isPositive: false,
      status: "completed",
      hash: "0xdef",
    },
    {
      date: "Oct 24, 2023",
      time: "09:30 AM",
      transactionId: "0xghi...789",
      type: "swap",
      assetDetails: "XLM → USDC",
      amountDisplay: "200 USDC",
      isPositive: null,
      status: "completed",
      hash: "0xghi",
    },
    {
      date: "Oct 23, 2023",
      time: "08:00 AM",
      transactionId: "0xjkl...012",
      type: "yield",
      assetDetails: "Staking Reward",
      amountDisplay: "+$12.45",
      isPositive: true,
      status: "pending",
      hash: "0xjkl",
    },
  ];

  function onExportCsv() {
    const csv = toCsv(transactions);
    downloadTextFile(
      `nestera-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-b from-[#063d3d] to-[#0a6f6f] flex items-center justify-center text-cyan-400 shadow-[0_8px_20px_rgba(6,61,61,0.3)]">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white m-0 tracking-tight">
              Transaction History
            </h1>
            <p className="text-[#5e8c96] text-sm md:text-base m-0 mt-1">
              Download your transactions as a CSV file for reporting.
            </p>
          </div>
        </div>

        <button
          onClick={onExportCsv}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#061a1a] font-bold rounded-xl transition-all shadow-lg active:scale-95"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[280px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by transaction, token, or hash..."
            className="w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {["Type: All", "Asset: All", "Status: All"].map((filter) => (
          <button
            type="button"
            key={filter}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-[#0e2330] border-white/5 text-[#5e8c96] hover:border-white/10 hover:text-white transition-all"
          >
            <span className="text-sm font-medium">{filter}</span>
            <ChevronDown size={14} opacity={0.7} />
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#0e2330] overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-white/5 text-[#5e8c96] text-xs font-bold uppercase tracking-widest">
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Transaction ID</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Asset / Details</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {transactions.map((t) => (
          <TransactionRow
            key={t.hash}
            date={t.date}
            time={t.time}
            transactionId={t.transactionId}
            type={t.type}
            assetDetails={t.assetDetails}
            amountDisplay={t.amountDisplay}
            isPositive={t.isPositive}
            status={t.status}
            onClick={(id) => console.log('Open transaction', id)}
          />
        ))}

        {/* Empty space filler */}
        <div className="h-[300px] border-b border-white/5"></div>

        {/* Pagination Controls */}
        <div className="px-5 py-4 flex items-center gap-4 text-sm font-semibold justify-end">
          <button className="text-[#5e8c96] hover:text-[#e2f8f8] transition-colors">&lt; Prev</button>
          <span className="px-4 py-1.5 bg-[rgba(6,110,110,0.2)] text-[#e2f8f8] rounded-lg">Page 1 of 12</span>
          <button className="text-[#e2f8f8] hover:text-[#8ef4ef] transition-colors flex items-center gap-1">Next &gt;</button>
        </div>
      </div>
    </div>
  );
}
