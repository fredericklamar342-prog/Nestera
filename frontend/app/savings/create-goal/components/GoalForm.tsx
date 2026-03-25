"use client";

import React from "react";
import { Calendar, CircleDollarSign, Flag, Sparkles } from "lucide-react";

type FormState = {
  goalName: string;
  category: string;
  targetAmount: string;
  targetDate: string;
};

type FormErrors = Partial<Record<keyof FormState, string>> & {
  form?: string;
};

function isPastDate(yyyyMmDd: string) {
  const date = new Date(`${yyyyMmDd}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date < today;
}

export default function GoalForm() {
  const [state, setState] = React.useState<FormState>({
    goalName: "",
    category: "General",
    targetAmount: "",
    targetDate: "",
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitted, setSubmitted] = React.useState(false);

  function validate(next: FormState): FormErrors {
    const nextErrors: FormErrors = {};

    if (!next.goalName.trim()) nextErrors.goalName = "Please enter a goal name.";
    if (!next.targetAmount.trim()) nextErrors.targetAmount = "Please enter a target amount.";
    if (next.targetAmount.trim()) {
      const parsed = Number(next.targetAmount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors.targetAmount = "Target amount must be greater than 0.";
      }
    }
    if (!next.targetDate.trim()) nextErrors.targetDate = "Please select a target date.";
    if (next.targetDate.trim() && isPastDate(next.targetDate)) {
      nextErrors.targetDate = "Target date can’t be in the past.";
    }

    return nextErrors;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(false);

    const nextErrors = validate(state);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Backend creation endpoint is not wired in this repo yet.
    // We still provide a complete UI and validate inputs client-side.
    setSubmitted(true);
    setState((s) => ({ ...s, goalName: "", targetAmount: "", targetDate: "" }));
  }

  return (
    <div id="goal-form" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-white/5 bg-linear-to-br from-[rgba(6,26,26,0.82)] to-[rgba(4,14,16,0.6)] shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-sm p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white m-0 tracking-tight">
                  Goal details
                </h2>
                <p className="text-[#6a8a93] text-sm m-0 mt-2">
                  Set a target and a date. You can start contributing right after.
                </p>
              </div>
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                <Sparkles size={20} />
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Goal name</label>
                <div className="relative">
                  <Flag className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]" size={18} />
                  <input
                    value={state.goalName}
                    onChange={(e) =>
                      setState((s) => ({ ...s, goalName: e.target.value }))
                    }
                    type="text"
                    placeholder="e.g. Emergency Fund"
                    className="w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                {errors.goalName && (
                  <p className="text-amber-400 text-xs mt-2 m-0">{errors.goalName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Category</label>
                  <select
                    value={state.category}
                    onChange={(e) =>
                      setState((s) => ({ ...s, category: e.target.value }))
                    }
                    className="w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-hidden focus:border-cyan-500/50 transition-colors"
                  >
                    {["General", "Security", "Travel", "Housing", "Education", "Tech"].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Target amount</label>
                  <div className="relative">
                    <CircleDollarSign
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]"
                      size={18}
                    />
                    <input
                      value={state.targetAmount}
                      onChange={(e) =>
                        setState((s) => ({ ...s, targetAmount: e.target.value }))
                      }
                      inputMode="decimal"
                      placeholder="e.g. 10000"
                      className="w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 transition-colors"
                    />
                  </div>
                  {errors.targetAmount && (
                    <p className="text-amber-400 text-xs mt-2 m-0">{errors.targetAmount}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Target date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]" size={18} />
                  <input
                    value={state.targetDate}
                    onChange={(e) =>
                      setState((s) => ({ ...s, targetDate: e.target.value }))
                    }
                    type="date"
                    className="w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                {errors.targetDate && (
                  <p className="text-amber-400 text-xs mt-2 m-0">{errors.targetDate}</p>
                )}
              </div>

              {submitted && (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                  <p className="text-emerald-300 text-sm font-semibold m-0">
                    Goal created (mock). Hook this up to the API when the endpoint is available.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
                <button
                  type="submit"
                  className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-[#061a1a] font-bold rounded-2xl transition-all shadow-[0_10px_20px_rgba(0,212,192,0.2)] active:scale-95"
                >
                  Create goal
                </button>
                <p className="text-[#6a8a93] text-xs m-0">
                  You’ll be able to contribute and track progress on the dashboard.
                </p>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-white/5 bg-[#0e2330] p-6 md:p-7">
            <h3 className="text-white font-bold text-lg m-0">Tips for success</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#6a8a93]">
              <li>
                <span className="text-white font-semibold">Pick a realistic timeline.</span>{" "}
                Shorter deadlines help momentum, but keep it achievable.
              </li>
              <li>
                <span className="text-white font-semibold">Start small.</span> Even modest
                contributions build consistency.
              </li>
              <li>
                <span className="text-white font-semibold">Name it clearly.</span> A specific
                goal feels more tangible and motivating.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

