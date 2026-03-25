'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import GoalCTASection from './components/GoalCTASection';
import GoalForm from './components/GoalForm';

export default function CreateGoalPage() {
  return (
    <section className="min-h-screen w-full bg-[#0A1A1A]">
      {/* Header with back button */}
      <div className="w-full bg-[#0A1A1A] border-b border-white/5">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-8 pt-6 pb-6">
          <Link
            href="/savings"
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            Back to Goals
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white m-0 tracking-tight">
            Create New Goal
          </h1>
          <p className="text-[#6a8a93] text-sm md:text-base m-0 mt-3">
            Set up a savings target and start tracking your progress
          </p>
        </div>
      </div>

      <GoalCTASection />
      <GoalForm />
    </section>
  );
}
