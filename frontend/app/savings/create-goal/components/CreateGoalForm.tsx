"use client";

import React, { useState } from "react";
import { ChevronDown, X } from "lucide-react";

export default function CreateGoalForm() {
  const [formData, setFormData] = useState({
    goalName: "",
    category: "",
    targetAmount: "",
    startingAmount: "",
    targetDate: "",
    frequency: "",
    description: "",
    autoSave: false,
    routeToYield: false,
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleToggle = (field: "autoSave" | "routeToYield") => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="w-full bg-[#0A1A1A] py-12 md:py-16">
      <div className="w-full max-w-2xl mx-auto px-6 md:px-8">
        <div className="rounded-2xl border border-white/10 bg-[#0D2626] shadow-2xl overflow-hidden relative">
          <div className="px-6 pt-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create New Goal</h2>
            <button
              type="button"
              className="text-[#8C9BAB] hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
          <form className="p-6 space-y-5">
            {/* Goal Name */}
            <div>
              <label className="block text-[#8C9BAB] font-semibold mb-2 text-sm">
                Goal Name
              </label>
              <input
                type="text"
                name="goalName"
                value={formData.goalName}
                onChange={handleChange}
                placeholder="e.g., Emergency Fund"
                className="w-full px-4 py-2.5 rounded-lg bg-[#0F2D2D] border border-white/10 text-[#8C9BAB] placeholder-[#6a8a93] focus:border-[#00D9C0] focus:outline-none transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[#8C9BAB] font-semibold mb-2 text-sm">
                Category
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0F2D2D] border border-white/10 text-[#8C9BAB] focus:border-[#00D9C0] focus:outline-none appearance-none transition-colors"
                >
                  <option value="">Select category</option>
                  <option value="emergency">Emergency Fund</option>
                  <option value="vacation">Vacation</option>
                  <option value="education">Education</option>
                  <option value="home">Home Purchase</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="retirement">Retirement</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a8a93] pointer-events-none"
                />
              </div>
            </div>

            {/* Target Amount and Starting Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#8C9BAB] font-semibold mb-2 text-sm">
                  Target Amount
                </label>
                <input
                  type="number"
                  name="targetAmount"
                  value={formData.targetAmount}
                  onChange={handleChange}
                  placeholder="$15,000"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0F2D2D] border border-white/10 text-[#8C9BAB] placeholder-[#6a8a93] focus:border-[#00D9C0] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#8C9BAB] font-semibold mb-2 text-sm">
                  Starting Amount
                </label>
                <input
                  type="number"
                  name="startingAmount"
                  value={formData.startingAmount}
                  onChange={handleChange}
                  placeholder="$0 (optional)"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0F2D2D] border border-white/10 text-[#8C9BAB] placeholder-[#6a8a93] focus:border-[#00D9C0] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Target Date and Frequency */}
            <div className="gap-4">
              <div>
                <label className="block text-[#8C9BAB] font-semibold mb-2 text-sm">
                  Target Date
                </label>
                <input
                  type="input"
                  name="targetDate"
                  placeholder="Select Date"
                  value={formData.targetDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0F2D2D] border border-white/10 text-[#8C9BAB] focus:border-[#00D9C0] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Toggles */}
            <div>
              <div className="gap-4 mb-4">
                <div>
                  <label className="block text-[#8C9BAB] font-semibold mb-2 text-sm">
                    Contribution Frequency
                  </label>
                  <div className="relative">
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0F2D2D] border border-white/10 text-[#A1ADAD] focus:border-[#00D9C0] focus:outline-none appearance-none transition-colors"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <ChevronDown
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1ADAD] pointer-events-none"
                  />
                </div>
                </div>
              </div>
              <div className="w-full px-3 py-5 rounded-lg bg-[#0F2D2D] border border-white/10 flex items-center justify-between">
                <label className="text-[#A1ADAD] font-semibold text-sm">
                  Enable auto-save
                </label>
                <button
                  type="button"
                  onClick={() => handleToggle("autoSave")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.autoSave ? "bg-[#00D9C0]" : "bg-[#1a3f3a]"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-[#A1ADAD] transition-transform ${
                      formData.autoSave ? "translate-x-5 bg-white" : "translate-x-0.5 bg-[#A1ADAD]"
                    }`}
                  />
                </button>
              </div>

              <div className="w-full px-3 py-3 mt-3 rounded-lg bg-[#0F2D2D] border border-white/10 flex items-center justify-between">
                <div>
                  <label className="text-[#A1ADAD] font-semibold text-sm">
                    Route to yield pool
                  </label>
                  <p className="text-[#4F6565] text-xs mt-0.5">
                    Earn 5% APY on your savings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("routeToYield")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.routeToYield ? "bg-[#00D9C0]" : "bg-[#1a3f3a]"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
                      formData.routeToYield
                        ? "translate-x-5 bg-white"
                        : "translate-x-0.5 bg-[#A1ADAD]"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-[#8C9BAB] font-semibold mb-2 text-sm">
                Note (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add a personal note or description..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0F2D2D] border border-white/10 text-[#8C9BAB] placeholder-[#6a8a93] focus:border-[#00D9C0] focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 pt-5">
              <button
                type="button"
                className="flex-1 px-4 py-2.5 border border-white/10 rounded-lg text-[#8C9BAB] font-semibold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-[#00D9C0] hover:bg-[#00b3a0] text-white font-semibold rounded-lg transition-all active:scale-95"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
