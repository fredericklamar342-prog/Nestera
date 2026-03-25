'use client';

import React from 'react';
import { ChevronRight, LayoutGrid } from 'lucide-react';

export default function GoalCTASection() {
  return (
    <div className="w-full flex-1">
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-20 md:py-32">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-8 flex items-center justify-center">
            <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-[#083F3A] flex items-center justify-center">
              <LayoutGrid size={56} className="text-[#00D9C0]" strokeWidth={1.5} />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-4 tracking-tight max-w-2xl">
            Start Your First Savings Goal
          </h2>

          <p className="text-[#6a8a93] text-sm md:text-base mb-10 max-w-lg leading-relaxed">
            Set targets, track progress, and achieve your financial dreams with structured goal-based savings
          </p>

          <a
            href="#goal-form"
            className="inline-flex items-center gap-2 px-4 py-4 bg-[#00D9C0] hover:bg-[#00b3a0] text-white font-semibold rounded-xl transition-all shadow-lg active:scale-95"
          >
            Create Your First Goal
            <ChevronRight size={20} />
          </a>
        </div>
      </div>
    </div>
  );
}
