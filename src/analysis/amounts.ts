/**
 * Amount distribution analysis
 * Identifies unique amounts and common denominations
 */

import { Deposit, AmountDistribution } from '../indexer/types';

export class AmountAnalyzer {
  /**
   * Calculate amount distribution
   */
  calculateAmountDistribution(deposits: Deposit[]): AmountDistribution {
    const amountCounts = new Map<number, number>();

    for (const deposit of deposits) {
      amountCounts.set(deposit.amount, (amountCounts.get(deposit.amount) || 0) + 1);
    }

    // Count unique amounts (appearing only once)
    const uniqueCount = Array.from(amountCounts.values()).filter(count => count === 1).length;
    const totalCount = deposits.length;
    const uniqueRatio = totalCount > 0 ? uniqueCount / totalCount : 0;

    // Get top amounts by frequency
    const topAmounts = Array.from(amountCounts.entries())
      .map(([amount, count]) => ({ amount, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      amounts: amountCounts,
      uniqueCount,
      totalCount,
      uniqueRatio,
      topAmounts,
    };
  }

  /**
   * Identify common denominations (e.g., 0.1 SOL, 1 SOL, 10 SOL)
   */
  findCommonDenominations(deposits: Deposit[], minCount: number = 10): number[] {
    const distribution = this.calculateAmountDistribution(deposits);

    return distribution.topAmounts
      .filter(a => a.count >= minCount)
      .map(a => a.amount);
  }

  /**
   * Calculate amount privacy score
   * Lower score = more unique amounts = worse privacy
   */
  calculateAmountPrivacyScore(distribution: AmountDistribution): number {
    // Score is based on how many deposits use common amounts
    // 0 = all unique amounts (worst)
    // 100 = all amounts are common (best)
    return Math.round((1 - distribution.uniqueRatio) * 100);
  }

  /**
   * Recommend better amounts for privacy
   */
  recommendAmounts(
    targetAmount: number,
    deposits: Deposit[]
  ): {
    recommendations: Array<{ amount: number; count: number; score: number }>;
    reasoning: string;
  } {
    const distribution = this.calculateAmountDistribution(deposits);

    // Find amounts close to target amount with good mixing sets
    const recommendations = distribution.topAmounts
      .filter(a => Math.abs(a.amount - targetAmount) / targetAmount < 0.5) // Within 50% of target
      .map(a => ({
        amount: a.amount,
        count: a.count,
        score: this.calculateMixingScore(a.count, distribution.totalCount),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    let reasoning = '';
    if (recommendations.length === 0) {
      reasoning = `No common amounts near ${this.formatAmount(targetAmount)}. Consider using popular denominations like 0.1, 1, or 10 SOL.`;
    } else {
      const best = recommendations[0];
      reasoning = `${this.formatAmount(best.amount)} has ${best.count} deposits, providing good mixing.`;
    }

    return { recommendations, reasoning };
  }

  /**
   * Calculate mixing score for an amount based on frequency
   */
  private calculateMixingScore(count: number, total: number): number {
    // Sweet spot: not too rare, not the majority
    const frequency = count / total;

    if (frequency < 0.01) {
      // Too rare
      return 30;
    } else if (frequency > 0.5) {
      // Too common (suspicious)
      return 70;
    } else {
      // Optimal range: 1% - 50%
      return 100;
    }
  }

  /**
   * Detect suspicious amount patterns
   */
  detectSuspiciousAmounts(deposits: Deposit[]): {
    suspiciousCount: number;
    examples: Array<{ amount: number; depositor: string; reason: string }>;
  } {
    const suspicious: Array<{ amount: number; depositor: string; reason: string }> = [];

    // Group by depositor
    const byDepositor = new Map<string, Deposit[]>();
    for (const deposit of deposits) {
      if (!byDepositor.has(deposit.depositor)) {
        byDepositor.set(deposit.depositor, []);
      }
      byDepositor.get(deposit.depositor)!.push(deposit);
    }

    // Check for repeated exact amounts from same address
    for (const [depositor, userDeposits] of byDepositor.entries()) {
      const amountCounts = new Map<number, number>();
      for (const deposit of userDeposits) {
        amountCounts.set(deposit.amount, (amountCounts.get(deposit.amount) || 0) + 1);
      }

      for (const [amount, count] of amountCounts.entries()) {
        if (count >= 3) {
          suspicious.push({
            amount,
            depositor,
            reason: `Same address deposited exact amount ${count} times`,
          });
        }
      }
    }

    // Check for very unusual amounts (likely unique)
    const distribution = this.calculateAmountDistribution(deposits);
    for (const [amount, count] of distribution.amounts.entries()) {
      if (count === 1 && amount > 100_000_000) { // > 0.1 SOL
        const deposit = deposits.find(d => d.amount === amount)!;
        suspicious.push({
          amount,
          depositor: deposit.depositor,
          reason: 'Unique amount makes this deposit easily linkable',
        });
      }
    }

    return {
      suspiciousCount: suspicious.length,
      examples: suspicious.slice(0, 10),
    };
  }

  /**
   * Calculate Gini coefficient for amount distribution
   * Measures inequality - lower is better for privacy (more equal distribution)
   */
  calculateGiniCoefficient(deposits: Deposit[]): number {
    if (deposits.length === 0) return 0;

    const amounts = deposits.map(d => d.amount).sort((a, b) => a - b);
    const n = amounts.length;

    let sumOfAbsoluteDifferences = 0;
    let sumOfAmounts = 0;

    for (let i = 0; i < n; i++) {
      sumOfAmounts += amounts[i];
      for (let j = 0; j < n; j++) {
        sumOfAbsoluteDifferences += Math.abs(amounts[i] - amounts[j]);
      }
    }

    const gini = sumOfAbsoluteDifferences / (2 * n * sumOfAmounts);
    return gini;
  }

  /**
   * Format amount in SOL
   */
  private formatAmount(lamports: number): string {
    const sol = lamports / 1e9;
    if (sol < 0.001) {
      return `${lamports} lamports`;
    } else if (sol < 1) {
      return `${sol.toFixed(3)} SOL`;
    } else {
      return `${sol.toFixed(2)} SOL`;
    }
  }

  /**
   * Convert lamports to SOL
   */
  lamportsToSol(lamports: number): number {
    return lamports / 1e9;
  }

  /**
   * Convert SOL to lamports
   */
  solToLamports(sol: number): number {
    return Math.round(sol * 1e9);
  }

  /**
   * Get standard denominations in lamports
   */
  getStandardDenominations(): number[] {
    return [
      this.solToLamports(0.01),   // 0.01 SOL
      this.solToLamports(0.05),   // 0.05 SOL
      this.solToLamports(0.1),    // 0.1 SOL
      this.solToLamports(0.5),    // 0.5 SOL
      this.solToLamports(1),      // 1 SOL
      this.solToLamports(5),      // 5 SOL
      this.solToLamports(10),     // 10 SOL
      this.solToLamports(50),     // 50 SOL
      this.solToLamports(100),    // 100 SOL
    ];
  }
}
