export class YieldBreakdownDto {
  pools: Array<{
    pool: string;
    earned: number;
  }>;
  totalInterestEarned: number;
}
