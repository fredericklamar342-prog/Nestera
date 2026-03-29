import { Injectable, Logger } from '@nestjs/common';

/**
 * Chronological Predictive Evaluator Service
 *
 * Provides mathematical calculations for evaluating if a user is on track
 * to meet their savings goals by explicit deadlines based on current yields.
 *
 * Abstracts complex timing analysis away from frontend logic.
 */
@Injectable()
export class PredictiveEvaluatorService {
  private readonly logger = new Logger(PredictiveEvaluatorService.name);

  /**
   * Calculate projected balance at target date using compound interest formula
   *
   * Formula: P = C * (1 + r/n)^(n*t)
   * Where:
   *   P = Projected balance
   *   C = Current balance
   *   r = Annual yield rate (as decimal, e.g., 0.025 for 2.5%)
   *   n = Compounding periods per year (12 for monthly)
   *   t = Time in years until target date
   *
   * @param currentBalance Current accumulated balance (in XLM)
   * @param yieldRate Annual yield rate as percentage (e.g., 2.5)
   * @param targetDate Target date to reach the goal
   * @returns Projected balance at target date
   */
  calculateProjectedBalance(
    currentBalance: number,
    yieldRate: number,
    targetDate: Date,
  ): number {
    if (currentBalance < 0 || yieldRate < 0) {
      this.logger.warn(
        `Invalid inputs: currentBalance=${currentBalance}, yieldRate=${yieldRate}`,
      );
      return currentBalance;
    }

    const now = new Date();
    const timeInMs = targetDate.getTime() - now.getTime();

    // If target date is in the past, return current balance
    if (timeInMs <= 0) {
      return currentBalance;
    }

    // Convert time to years
    const timeInYears = timeInMs / (1000 * 60 * 60 * 24 * 365.25);

    // Convert percentage to decimal (e.g., 2.5 -> 0.025)
    const rateDecimal = yieldRate / 100;

    // Compound interest formula with monthly compounding (n=12)
    const compoundingPeriodsPerYear = 12;
    const projectedBalance =
      currentBalance *
      Math.pow(
        1 + rateDecimal / compoundingPeriodsPerYear,
        compoundingPeriodsPerYear * timeInYears,
      );

    return Math.round(projectedBalance * 100) / 100; // Round to 2 decimals
  }

  /**
   * Evaluate if user is off track to meet their goal
   *
   * @param projectedBalance Projected balance at target date
   * @param targetAmount Target amount to accumulate
   * @returns true if projected balance < target amount (off track)
   */
  isOffTrack(projectedBalance: number, targetAmount: number): boolean {
    return projectedBalance < targetAmount;
  }

  /**
   * Calculate the gap between target and projected balance
   *
   * @param targetAmount Target amount to accumulate
   * @param projectedBalance Projected balance at target date
   * @returns Gap amount (positive if off track, negative if ahead)
   */
  calculateProjectionGap(
    targetAmount: number,
    projectedBalance: number,
  ): number {
    const gap = targetAmount - projectedBalance;
    return Math.round(gap * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate days remaining until target date
   *
   * @param targetDate Target date
   * @returns Number of days remaining (0 if date is in past)
   */
  calculateDaysRemaining(targetDate: Date): number {
    const now = new Date();
    const timeInMs = targetDate.getTime() - now.getTime();

    if (timeInMs <= 0) {
      return 0;
    }

    return Math.ceil(timeInMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate required monthly contribution to meet goal
   *
   * Uses Future Value of Annuity formula to determine monthly savings needed
   * Formula: PMT = FV / [((1 + r)^n - 1) / r]
   * Where:
   *   FV = Future Value (target amount - current balance)
   *   r = Monthly interest rate
   *   n = Number of months
   *
   * @param targetAmount Target amount to accumulate
   * @param currentBalance Current balance
   * @param yieldRate Annual yield rate as percentage
   * @param targetDate Target date
   * @returns Required monthly contribution (0 if already on track)
   */
  calculateRequiredMonthlyContribution(
    targetAmount: number,
    currentBalance: number,
    yieldRate: number,
    targetDate: Date,
  ): number {
    const futureValueNeeded = Math.max(0, targetAmount - currentBalance);

    if (futureValueNeeded <= 0) {
      return 0;
    }

    const monthlyRate = yieldRate / 100 / 12;
    const daysRemaining = this.calculateDaysRemaining(targetDate);
    const monthsRemaining = Math.max(1, daysRemaining / 30.44); // Average days per month

    // If no yield, simple division
    if (monthlyRate === 0) {
      return Math.round((futureValueNeeded / monthsRemaining) * 100) / 100;
    }

    // Future Value of Annuity formula
    const numerator = futureValueNeeded * monthlyRate;
    const denominator = Math.pow(1 + monthlyRate, monthsRemaining) - 1;

    const requiredMonthly = numerator / denominator;

    return Math.round(requiredMonthly * 100) / 100;
  }
}
