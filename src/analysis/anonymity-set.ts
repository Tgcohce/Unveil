/**
 * Anonymity set calculator
 * Calculates the anonymity set for each withdrawal
 */

import { Deposit, Withdrawal } from "../indexer/types";

export interface AnonymitySetResult {
  withdrawalSignature: string;
  anonymitySet: number;
  candidateDeposits: string[]; // Signatures of possible source deposits
  timestamp: number;
}

export class AnonymitySetCalculator {
  // Fee tolerance: 5% (mixing protocols typically charge 0.1-5% fees)
  // Withdrawal amount should be 95-101% of deposit amount (allowing for small rounding)
  private readonly FEE_TOLERANCE_MIN = 0.95; // Withdrawal can be 5% less than deposit
  private readonly FEE_TOLERANCE_MAX = 1.01; // Withdrawal can be 1% more (for rounding)

  /**
   * Calculate anonymity set for a single withdrawal
   * @param withdrawal The withdrawal to analyze
   * @param deposits All deposits in the database
   * @param timeWindowHours Maximum time window to consider (default: 168 hours = 7 days)
   */
  calculateAnonymitySet(
    withdrawal: Withdrawal,
    deposits: Deposit[],
    timeWindowHours: number = 168,
  ): AnonymitySetResult {
    const windowStart = withdrawal.timestamp - timeWindowHours * 3600 * 1000;

    // Filter deposits that could be the source of this withdrawal
    const candidates = deposits.filter((d) => {
      // Withdrawal should be 95-101% of deposit (after fees deducted)
      const ratio = withdrawal.amount / d.amount;
      const amountMatches =
        ratio >= this.FEE_TOLERANCE_MIN && ratio <= this.FEE_TOLERANCE_MAX;

      return (
        // Matching amount (with fee tolerance)
        amountMatches &&
        // Occurred before withdrawal
        d.timestamp >= windowStart &&
        d.timestamp <= withdrawal.timestamp &&
        // Not yet withdrawn (or we don't know if it's withdrawn)
        !d.spent
      );
    });

    return {
      withdrawalSignature: withdrawal.signature,
      anonymitySet: candidates.length,
      candidateDeposits: candidates.map((d) => d.signature),
      timestamp: withdrawal.timestamp,
    };
  }

  /**
   * Calculate anonymity sets for all withdrawals
   * @param withdrawals All withdrawals
   * @param deposits All deposits
   * @param timeWindowHours Time window for consideration
   */
  calculateAllAnonymitySets(
    withdrawals: Withdrawal[],
    deposits: Deposit[],
    timeWindowHours: number = 168,
  ): AnonymitySetResult[] {
    const results: AnonymitySetResult[] = [];

    // Sort withdrawals by timestamp for efficient processing
    const sortedWithdrawals = [...withdrawals].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    for (const withdrawal of sortedWithdrawals) {
      const result = this.calculateAnonymitySet(
        withdrawal,
        deposits,
        timeWindowHours,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate aggregate statistics for anonymity sets
   */
  calculateStatistics(results: AnonymitySetResult[]): {
    mean: number;
    median: number;
    min: number;
    max: number;
    p25: number;
    p75: number;
    distribution: Map<number, number>; // anonymity set size -> count
  } {
    if (results.length === 0) {
      return {
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        p25: 0,
        p75: 0,
        distribution: new Map(),
      };
    }

    const sizes = results.map((r) => r.anonymitySet).sort((a, b) => a - b);

    // Calculate mean
    const mean = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;

    // Calculate median
    const median = this.percentile(sizes, 50);

    // Calculate min/max
    const min = sizes[0];
    const max = sizes[sizes.length - 1];

    // Calculate percentiles
    const p25 = this.percentile(sizes, 25);
    const p75 = this.percentile(sizes, 75);

    // Build distribution
    const distribution = new Map<number, number>();
    for (const size of sizes) {
      distribution.set(size, (distribution.get(size) || 0) + 1);
    }

    return { mean, median, min, max, p25, p75, distribution };
  }

  /**
   * Calculate time-series snapshots of anonymity sets
   * @param results Anonymity set results
   * @param intervalMs Interval between snapshots (default: 1 hour)
   */
  calculateTimeSeries(
    results: AnonymitySetResult[],
    intervalMs: number = 3600 * 1000,
  ): Array<{
    timestamp: number;
    avgSize: number;
    minSize: number;
    maxSize: number;
    count: number;
  }> {
    if (results.length === 0) {
      return [];
    }

    // Sort by timestamp
    const sorted = [...results].sort((a, b) => a.timestamp - b.timestamp);

    const firstTime = sorted[0].timestamp;
    const lastTime = sorted[sorted.length - 1].timestamp;

    const snapshots: Array<{
      timestamp: number;
      avgSize: number;
      minSize: number;
      maxSize: number;
      count: number;
    }> = [];

    for (let time = firstTime; time <= lastTime; time += intervalMs) {
      const windowEnd = time + intervalMs;
      const windowResults = sorted.filter(
        (r) => r.timestamp >= time && r.timestamp < windowEnd,
      );

      if (windowResults.length > 0) {
        const sizes = windowResults.map((r) => r.anonymitySet);
        const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
        const minSize = Math.min(...sizes);
        const maxSize = Math.max(...sizes);

        snapshots.push({
          timestamp: time,
          avgSize,
          minSize,
          maxSize,
          count: windowResults.length,
        });
      }
    }

    return snapshots;
  }

  /**
   * Identify withdrawals with weak anonymity sets
   * @param results Anonymity set results
   * @param threshold Minimum acceptable anonymity set size
   */
  findWeakAnonymitySets(
    results: AnonymitySetResult[],
    threshold: number = 10,
  ): AnonymitySetResult[] {
    return results.filter((r) => r.anonymitySet < threshold);
  }

  /**
   * Calculate percentile value
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;

    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Estimate anonymity set for a hypothetical withdrawal
   * Useful for the privacy advisor feature
   */
  estimateAnonymitySet(
    amount: number,
    estimatedWithdrawalTime: number,
    deposits: Deposit[],
    timeWindowHours: number = 168,
  ): number {
    const windowStart = estimatedWithdrawalTime - timeWindowHours * 3600 * 1000;

    const candidates = deposits.filter((d) => {
      // Withdrawal should be 95-101% of deposit (after fees)
      const ratio = amount / d.amount;
      const amountMatches =
        ratio >= this.FEE_TOLERANCE_MIN && ratio <= this.FEE_TOLERANCE_MAX;

      return (
        amountMatches &&
        d.timestamp >= windowStart &&
        d.timestamp <= estimatedWithdrawalTime &&
        !d.spent
      );
    });

    return candidates.length;
  }
}
