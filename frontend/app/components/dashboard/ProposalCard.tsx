"use client";

type ProposalCardProps = {
  id: string;
  title: string;
  categories?: string[];
  countdownText?: string;
  forPercent: number;
  againstPercent: number;
  status?: string;
  onVote?: () => void;
};

export default function ProposalCard({
  id,
  title,
  categories = [],
  countdownText,
  forPercent,
  againstPercent,
  status = "ACTIVE",
  onVote,
}: ProposalCardProps) {
  const safeFor = Math.max(0, Math.min(100, Math.round(forPercent)));
  const safeAgainst = Math.max(0, Math.min(100, Math.round(againstPercent)));
  const normalizedStatus = status.toUpperCase();
  const isActive = normalizedStatus === "ACTIVE";
  const isRejected =
    normalizedStatus === "REJECTED" || normalizedStatus === "FAILED";
  const statusPillClass = isRejected
    ? "bg-red-500/15 text-red-300 border-red-400/40"
    : "bg-[#10314F] border-2 border-[#215091] text-[#60A5FA]";
  const mobilePillClass = isRejected
    ? "bg-red-500/15 text-red-300"
    : "bg-[#08333a] text-sky-200";
  const ctaLabel = isActive ? "Vote Now" : "View details";

  return (
    <div className="w-full rounded-2xl bg-[#061E26] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 shadow-lg border border-transparent">
      <div className="flex-1 min-w-0 w-full">
        {/* Top row on mobile: id at left, status at right (status shown only on mobile here) */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[#64748B]">{id}</span>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full md:hidden ${mobilePillClass}`}
          >
            {status}
          </span>
        </div>

        {/* Title row */}
        <div className="mb-3">
          <h3 className="text-lg md:text-xl font-semibold text-white truncate">
            {title}
          </h3>
        </div>

        {/* Categories + countdown row (left-aligned) */}
        <div className="flex items-center gap-3 mb-4">
          {categories.map((c) => (
            <span
              key={c}
              className="text-xs font-medium px-3 py-1 rounded-full bg-[#122830] border-2 border-[#1E333B] text-[#94A3B8]"
            >
              {c}
            </span>
          ))}

          {countdownText && (
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#05313C] border-2 border-[#035362] text-sky-200">
              {countdownText}
            </span>
          )}
        </div>

        {/* Vote summary and progress bar (constrain width on large screens to a bit above half) */}
        <div className="mb-2 w-full lg:max-w-[80%]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-sky-300 font-semibold">
              {safeFor}% For
            </div>
            <div className="text-sm text-[#F33E5D] font-semibold">
              {safeAgainst}% Against
            </div>
          </div>

          <div className="w-full h-3 rounded-full bg-[#02242a] overflow-hidden">
            <div className="relative w-full h-full">
              <div
                className="absolute left-0 top-0 h-full rounded-l-full"
                style={{
                  width: `${safeFor}%`,
                  background: "linear-gradient(90deg,#15e6d9,#00c2ff)",
                }}
              />
              <div
                className="absolute right-0 top-0 h-full rounded-r-full"
                style={{
                  width: `${safeAgainst}%`,
                  background: "linear-gradient(90deg,#F33E5D,#BF133C)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right column for desktop: status + button. Hidden on mobile. */}
      <div className="hidden md:flex md:flex-col md:items-end md:gap-4">
        <div className="flex flex-col items-end gap-3">
          <span className={`text-xs font-bold px-3 py-2 rounded-xl ${statusPillClass}`}>
            {status}
          </span>
        </div>

        <div>
          <button
            onClick={onVote}
            className="px-5 py-3 rounded-xl bg-linear-to-r from-sky-400 to-cyan-300 text-[#042024] font-semibold shadow-md hover:brightness-110"
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      {/* Mobile-only full-width Vote button placed as the last row */}
      <div className="w-full mt-4 md:hidden">
        <button
          onClick={onVote}
          className="w-full px-5 py-3 rounded-xl bg-linear-to-r from-sky-400 to-cyan-300 text-[#042024] font-semibold shadow-md hover:brightness-110"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
