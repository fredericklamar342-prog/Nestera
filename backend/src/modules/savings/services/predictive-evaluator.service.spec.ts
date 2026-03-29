import { Test, TestingModule } from '@nestjs/testing';
import { PredictiveEvaluatorService } from './predictive-evaluator.service';

describe('PredictiveEvaluatorService', () => {
  let service: PredictiveEvaluatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PredictiveEvaluatorService],
    }).compile();

    service = module.get<PredictiveEvaluatorService>(
      PredictiveEvaluatorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateProjectedBalance', () => {
    it('should calculate projected balance with compound interest', () => {
      const currentBalance = 1000;
      const yieldRate = 5; // 5% annual
      const targetDate = new Date();
      targetDate.setFullYear(targetDate.getFullYear() + 1); // 1 year from now

      const projected = service.calculateProjectedBalance(
        currentBalance,
        yieldRate,
        targetDate,
      );

      // With 5% annual yield compounded monthly, should be approximately 1051.14
      expect(projected).toBeGreaterThan(currentBalance);
      expect(projected).toBeLessThan(currentBalance * 1.06); // Less than 6% growth
    });

    it('should return current balance if target date is in the past', () => {
      const currentBalance = 1000;
      const yieldRate = 5;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1); // Yesterday

      const projected = service.calculateProjectedBalance(
        currentBalance,
        yieldRate,
        targetDate,
      );

      expect(projected).toBe(currentBalance);
    });

    it('should handle zero yield rate', () => {
      const currentBalance = 1000;
      const yieldRate = 0;
      const targetDate = new Date();
      targetDate.setFullYear(targetDate.getFullYear() + 1);

      const projected = service.calculateProjectedBalance(
        currentBalance,
        yieldRate,
        targetDate,
      );

      expect(projected).toBe(currentBalance);
    });

    it('should handle negative inputs gracefully', () => {
      const currentBalance = -100;
      const yieldRate = -5;
      const targetDate = new Date();
      targetDate.setFullYear(targetDate.getFullYear() + 1);

      const projected = service.calculateProjectedBalance(
        currentBalance,
        yieldRate,
        targetDate,
      );

      expect(projected).toBe(currentBalance);
    });
  });

  describe('isOffTrack', () => {
    it('should return true if projected balance is less than target', () => {
      const result = service.isOffTrack(1000, 1500);
      expect(result).toBe(true);
    });

    it('should return false if projected balance meets target', () => {
      const result = service.isOffTrack(1500, 1500);
      expect(result).toBe(false);
    });

    it('should return false if projected balance exceeds target', () => {
      const result = service.isOffTrack(2000, 1500);
      expect(result).toBe(false);
    });
  });

  describe('calculateProjectionGap', () => {
    it('should calculate positive gap when off track', () => {
      const gap = service.calculateProjectionGap(1500, 1000);
      expect(gap).toBe(500);
    });

    it('should calculate negative gap when ahead of target', () => {
      const gap = service.calculateProjectionGap(1500, 2000);
      expect(gap).toBe(-500);
    });

    it('should return zero when on target', () => {
      const gap = service.calculateProjectionGap(1500, 1500);
      expect(gap).toBe(0);
    });
  });

  describe('calculateDaysRemaining', () => {
    it('should calculate days remaining until target date', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 10);

      const daysRemaining = service.calculateDaysRemaining(targetDate);
      expect(daysRemaining).toBe(10);
    });

    it('should return 0 if target date is in the past', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);

      const daysRemaining = service.calculateDaysRemaining(targetDate);
      expect(daysRemaining).toBe(0);
    });

    it('should return 0 if target date is today', () => {
      const targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);

      const daysRemaining = service.calculateDaysRemaining(targetDate);
      expect(daysRemaining).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateRequiredMonthlyContribution', () => {
    it('should return 0 if already on track', () => {
      const targetAmount = 1000;
      const currentBalance = 1000;
      const yieldRate = 5;
      const targetDate = new Date();
      targetDate.setFullYear(targetDate.getFullYear() + 1);

      const required = service.calculateRequiredMonthlyContribution(
        targetAmount,
        currentBalance,
        yieldRate,
        targetDate,
      );

      expect(required).toBe(0);
    });

    it('should calculate required monthly contribution', () => {
      const targetAmount = 2000;
      const currentBalance = 1000;
      const yieldRate = 0; // No yield for simplicity
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 12); // 12 months

      const required = service.calculateRequiredMonthlyContribution(
        targetAmount,
        currentBalance,
        yieldRate,
        targetDate,
      );

      // Need to save 1000 over 12 months = ~83.33 per month
      expect(required).toBeGreaterThan(80);
      expect(required).toBeLessThan(90);
    });

    it('should handle target date in the past', () => {
      const targetAmount = 2000;
      const currentBalance = 1000;
      const yieldRate = 5;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);

      const required = service.calculateRequiredMonthlyContribution(
        targetAmount,
        currentBalance,
        yieldRate,
        targetDate,
      );

      // Should return a very high number since time is up
      expect(required).toBeGreaterThan(0);
    });
  });
});
