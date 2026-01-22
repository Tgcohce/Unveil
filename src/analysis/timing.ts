/**
 * Timing distribution analysis
 * Analyzes deposit→withdrawal time patterns
 */

import {
  Deposit,
  Withdrawal,
  DepositWithdrawalPair,
  TimingDistribution,
} from "../indexer/types";

export class TimingAnalyzer {
  // Fee tolerance: Withdrawal should be 95-101% of deposit
  private readonly FEE_TOLERANCE_MIN = 0.95;
  private readonly FEE_TOLERANCE_MAX = 1.01;

  /**
   * Match deposits to withdrawals based on amount and timing
   * Note: This creates hypothetical pairs for analysis, not guaranteed true linkage
   */
  matchDepositWithdrawalPairs(
    deposits: Deposit[],
    withdrawals: Withdrawal[],
  ): DepositWithdrawalPair[] {
    const pairs: DepositWithdrawalPair[] = [];

    // Sort deposits and withdrawals by timestamp
    const sortedDeposits = [...deposits].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    const sortedWithdrawals = [...withdrawals].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    for (const withdrawal of sortedWithdrawals) {
      // Find deposits with matching amount (with fee tolerance) that occurred before withdrawal
      const matchingDeposits = sortedDeposits.filter((d) => {
        const ratio = withdrawal.amount / d.amount;
        return (
          ratio >= this.FEE_TOLERANCE_MIN &&
          ratio <= this.FEE_TOLERANCE_MAX &&
          d.timestamp < withdrawal.timestamp
        );
      });

      if (matchingDeposits.length > 0) {
        // Use the closest deposit by time (not necessarily the true source)
        // This is for statistical analysis only
        const closestDeposit = matchingDeposits.reduce((closest, current) => {
          const closestDelta = Math.abs(
            withdrawal.timestamp - closest.timestamp,
          );
          const currentDelta = Math.abs(
            withdrawal.timestamp - current.timestamp,
          );
          return currentDelta < closestDelta ? current : closest;
        });

        pairs.push({
          deposit: closestDeposit,
          withdrawal,
          timeDelta: withdrawal.timestamp - closestDeposit.timestamp,
          anonymitySet: matchingDeposits.length,
        });
      }
    }

    return pairs;
  }

  /**
   * Calculate timing distribution from deposit-withdrawal pairs
   * @param pairs Deposit-withdrawal pairs
   * @param bucketSizeMs Bucket size in milliseconds (default: 1 hour)
   */
  calculateTimingDistribution(
    pairs: DepositWithdrawalPair[],
    bucketSizeMs: number = 3600 * 1000,
  ): TimingDistribution {
    if (pairs.length === 0) {
      return {
        buckets: new Map(),
        mean: 0,
        median: 0,
        p25: 0,
        p75: 0,
        entropy: 0,
      };
    }

    const deltas = pairs.map((p) => p.timeDelta).sort((a, b) => a - b);

    // Create histogram buckets
    const buckets = new Map<number, number>();
    for (const delta of deltas) {
      const bucket = Math.floor(delta / bucketSizeMs);
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    // Calculate statistics
    const mean = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const median = this.percentile(deltas, 50);
    const p25 = this.percentile(deltas, 25);
    const p75 = this.percentile(deltas, 75);

    // Calculate Shannon entropy
    const entropy = this.calculateEntropy(buckets, deltas.length);

    return {
      buckets,
      mean,
      median,
      p25,
      p75,
      entropy,
    };
  }

  /**
   * Calculate Shannon entropy of timing distribution
   * Higher entropy = more random = better privacy
   */
  private calculateEntropy(
    buckets: Map<number, number>,
    total: number,
  ): number {
    let entropy = 0;

    for (const count of buckets.values()) {
      const p = count / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /**
   * Detect timing patterns (e.g., withdrawals happening at specific intervals)
   */
  detectTimingPatterns(pairs: DepositWithdrawalPair[]): {
    hasPattern: boolean;
    dominantIntervals: number[]; // Intervals in hours
    confidence: number; // 0-1
  } {
    if (pairs.length < 10) {
      return { hasPattern: false, dominantIntervals: [], confidence: 0 };
    }

    const distribution = this.calculateTimingDistribution(pairs);

    // Find dominant buckets (> 2x average)
    const avgCount = pairs.length / distribution.buckets.size;
    const dominantBuckets: number[] = [];

    for (const [bucket, count] of distribution.buckets.entries()) {
      if (count > avgCount * 2) {
        dominantBuckets.push(bucket);
      }
    }

    // Calculate confidence based on entropy
    // Low entropy = strong pattern
    const maxEntropy = Math.log2(distribution.buckets.size);
    const normalizedEntropy = distribution.entropy / maxEntropy;
    const confidence = 1 - normalizedEntropy;

    const hasPattern = dominantBuckets.length > 0 && confidence > 0.3;

    return {
      hasPattern,
      dominantIntervals: dominantBuckets.map((b) => b), // Convert bucket to hours
      confidence,
    };
  }

  /**
   * Calculate timing statistics by time of day
   * Identifies if there are preferred withdrawal times
   */
  analyzeTimeOfDay(withdrawals: Withdrawal[]): Map<number, number> {
    const hourCounts = new Map<number, number>();

    for (const withdrawal of withdrawals) {
      const date = new Date(withdrawal.timestamp);
      const hour = date.getUTCHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return hourCounts;
  }

  /**
   * Calculate timing statistics by day of week
   */
  analyzeDayOfWeek(withdrawals: Withdrawal[]): Map<number, number> {
    const dayCounts = new Map<number, number>();

    for (const withdrawal of withdrawals) {
      const date = new Date(withdrawal.timestamp);
      const day = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    return dayCounts;
  }

  /**
   * Generate time-series of timing entropy
   * Shows how timing randomness evolves over time
   */
  calculateTimingEntropyTimeSeries(
    pairs: DepositWithdrawalPair[],
    windowSizeMs: number = 24 * 3600 * 1000, // 24 hours
    stepSizeMs: number = 3600 * 1000, // 1 hour
  ): Array<{ timestamp: number; entropy: number; sampleSize: number }> {
    if (pairs.length === 0) {
      return [];
    }

    const sorted = [...pairs].sort(
      (a, b) => a.withdrawal.timestamp - b.withdrawal.timestamp,
    );
    const firstTime = sorted[0].withdrawal.timestamp;
    const lastTime = sorted[sorted.length - 1].withdrawal.timestamp;

    const series: Array<{
      timestamp: number;
      entropy: number;
      sampleSize: number;
    }> = [];

    for (
      let time = firstTime;
      time <= lastTime - windowSizeMs;
      time += stepSizeMs
    ) {
      const windowPairs = sorted.filter(
        (p) =>
          p.withdrawal.timestamp >= time &&
          p.withdrawal.timestamp < time + windowSizeMs,
      );

      if (windowPairs.length >= 5) {
        const distribution = this.calculateTimingDistribution(windowPairs);
        series.push({
          timestamp: time,
          entropy: distribution.entropy,
          sampleSize: windowPairs.length,
        });
      }
    }

    return series;
  }

  /**
   * Recommend optimal timing for privacy
   */
  recommendTiming(pairs: DepositWithdrawalPair[]): {
    optimalRangeHours: { min: number; max: number };
    reasoning: string;
  } {
    if (pairs.length < 10) {
      return {
        optimalRangeHours: { min: 12, max: 48 },
        reasoning:
          "Insufficient data for precise recommendation. General guideline: wait 12-48 hours.",
      };
    }

    const distribution = this.calculateTimingDistribution(pairs);
    const medianHours = distribution.median / (3600 * 1000);
    const p25Hours = distribution.p25 / (3600 * 1000);
    const p75Hours = distribution.p75 / (3600 * 1000);

    // Recommend the interquartile range for best blending
    return {
      optimalRangeHours: {
        min: Math.floor(p25Hours),
        max: Math.ceil(p75Hours),
      },
      reasoning: `Most users withdraw between ${Math.floor(p25Hours)}-${Math.ceil(p75Hours)} hours after deposit. Staying in this range maximizes your anonymity set.`,
    };
  }

  /**
   * Calculate percentile
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
   * Format time delta in human-readable format
   */
  formatTimeDelta(deltaMs: number): string {
    const hours = deltaMs / (3600 * 1000);

    if (hours < 1) {
      const minutes = Math.floor(deltaMs / (60 * 1000));
      return `${minutes} minutes`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hours`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days}d ${remainingHours}h`;
    }
  }
}
