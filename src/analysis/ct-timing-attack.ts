/**
 * CT Deposit/Withdraw Timing Correlation Attack
 *
 * KEY INSIGHT: Confidential Transfer Deposit and Withdraw have PUBLIC amounts!
 *
 * Attack Strategy:
 * 1. AMOUNT MATCHING
 *    - Deposit amount = Withdraw amount (exact match)
 *    - Find all withdrawals that match a deposit amount
 *
 * 2. TIMING CORRELATION
 *    - Users typically withdraw within hours/days of deposit
 *    - Narrow time windows = higher confidence match
 *
 * 3. ADDRESS REUSE
 *    - Same owner depositing and withdrawing = trivial link
 *    - Even different owners: amount + timing still links
 *
 * This is a CRITICAL vulnerability in Token-2022 Confidential Transfers!
 */

import {
  CTDeposit,
  CTWithdraw,
  CTMatch,
  CTAnalysisResult,
  TOKEN_2022_PROGRAM_ID,
} from "../indexer/types";

export class CTTimingCorrelationAttack {
  /**
   * Run comprehensive timing correlation attack on CT deposits/withdrawals
   */
  analyze(deposits: CTDeposit[], withdrawals: CTWithdraw[]): CTAnalysisResult {
    console.log(
      `\nAnalyzing ${deposits.length} deposits and ${withdrawals.length} withdrawals...`,
    );

    // 1. Run amount + timing correlation attack
    const matches = this.correlationAttack(deposits, withdrawals);

    // 2. Analyze amount patterns
    const amountMetrics = this.analyzeAmountPatterns(
      deposits,
      withdrawals,
      matches,
    );

    // 3. Analyze address patterns
    const addressMetrics = this.analyzeAddressPatterns(deposits, withdrawals);

    // 4. Calculate privacy score
    const privacyScore = this.calculatePrivacyScore(
      matches.length,
      deposits.length,
      withdrawals.length,
      amountMetrics,
      addressMetrics,
    );

    // 5. Identify vulnerabilities
    const { vulnerabilities, recommendations } = this.identifyVulnerabilities(
      matches,
      amountMetrics,
      addressMetrics,
    );

    const linkabilityRate =
      withdrawals.length > 0 ? (matches.length / withdrawals.length) * 100 : 0;

    const avgTimeDelta =
      matches.length > 0
        ? matches.reduce((sum, m) => sum + m.timeDeltaHours, 0) / matches.length
        : 0;

    return {
      protocol: "Confidential Transfers",
      programId: TOKEN_2022_PROGRAM_ID,
      privacyScore,

      totalDeposits: deposits.length,
      totalWithdrawals: withdrawals.length,
      matchedPairs: matches.length,

      linkabilityRate,
      avgConfidence:
        matches.length > 0
          ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
          : 0,
      avgTimeDelta,

      exactMatchRate: amountMetrics.exactMatchRate,
      uniqueAmountRatio: amountMetrics.uniqueAmountRatio,

      addressReuseRate: addressMetrics.reuseRate,
      avgTxsPerAddress: addressMetrics.avgTxsPerAddress,

      vulnerabilities,
      recommendations,

      matches,
    };
  }

  /**
   * Amount + Timing Correlation Attack
   *
   * For each withdrawal, find potential matching deposits based on:
   * 1. Exact amount match
   * 2. Time window: deposit before withdrawal
   * 3. Closer timing = higher confidence
   */
  private correlationAttack(
    deposits: CTDeposit[],
    withdrawals: CTWithdraw[],
  ): CTMatch[] {
    const matches: CTMatch[] = [];
    const usedDeposits = new Set<string>(); // Prevent double-matching

    // Sort by timestamp
    const sortedDeposits = [...deposits].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    const sortedWithdrawals = [...withdrawals].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    for (const withdraw of sortedWithdrawals) {
      // Find candidate deposits with matching amount
      const candidates = sortedDeposits.filter((deposit) => {
        if (usedDeposits.has(deposit.signature)) return false;
        if (deposit.timestamp >= withdraw.timestamp) return false; // Must be before
        if (deposit.amount !== withdraw.amount) return false; // Must match amount
        if (deposit.mint !== withdraw.mint) return false; // Must be same token
        return true;
      });

      if (candidates.length === 0) continue;

      // Score each candidate by timing
      const scoredCandidates = candidates.map((deposit) => {
        const timeDeltaMs = withdraw.timestamp - deposit.timestamp;
        const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);

        // Timing score: closer = higher (decay over 48 hours)
        const timingScore = Math.max(0, 1 - timeDeltaHours / 48);

        // Same owner = 100% confidence
        const sameOwner = deposit.owner === withdraw.owner;
        const ownerScore = sameOwner ? 0.3 : 0;

        // Combined score
        const totalScore = Math.min(1, timingScore * 0.7 + ownerScore);

        return {
          deposit,
          timeDeltaHours,
          sameOwner,
          score: totalScore,
        };
      });

      // Sort by score and take the best match
      scoredCandidates.sort((a, b) => b.score - a.score);

      if (scoredCandidates.length > 0 && scoredCandidates[0].score > 0.1) {
        const best = scoredCandidates[0];
        const matchReasons: string[] = [];

        matchReasons.push(`Exact amount match: ${best.deposit.amount}`);
        matchReasons.push(
          `Time delta: ${best.timeDeltaHours.toFixed(1)} hours`,
        );

        if (best.sameOwner) {
          matchReasons.push(
            `SAME OWNER: ${best.deposit.owner.slice(0, 20)}...`,
          );
        }

        // Confidence as percentage
        const confidence = Math.round(best.score * 100);

        matches.push({
          depositId: best.deposit.id || 0,
          withdrawId: withdraw.id || 0,
          deposit: best.deposit,
          withdraw,
          confidence,
          timeDeltaHours: best.timeDeltaHours,
          amountMatch: true,
          matchReasons,
        });

        usedDeposits.add(best.deposit.signature);
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  /**
   * Analyze amount patterns
   */
  private analyzeAmountPatterns(
    deposits: CTDeposit[],
    withdrawals: CTWithdraw[],
    matches: CTMatch[],
  ) {
    // Count unique amounts
    const depositAmounts = new Set(deposits.map((d) => d.amount));
    const withdrawAmounts = new Set(withdrawals.map((w) => w.amount));

    const uniqueAmountRatio =
      deposits.length > 0 ? depositAmounts.size / deposits.length : 0;

    const exactMatchRate =
      withdrawals.length > 0 ? matches.length / withdrawals.length : 0;

    // Find most common amounts
    const amountCounts = new Map<number, number>();
    for (const deposit of deposits) {
      amountCounts.set(
        deposit.amount,
        (amountCounts.get(deposit.amount) || 0) + 1,
      );
    }

    const commonAmounts = Array.from(amountCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      uniqueAmountRatio,
      exactMatchRate,
      commonAmounts,
      totalUniqueDepositAmounts: depositAmounts.size,
      totalUniqueWithdrawAmounts: withdrawAmounts.size,
    };
  }

  /**
   * Analyze address patterns
   */
  private analyzeAddressPatterns(
    deposits: CTDeposit[],
    withdrawals: CTWithdraw[],
  ) {
    // Count transactions per address
    const addressCounts = new Map<string, number>();

    for (const deposit of deposits) {
      addressCounts.set(
        deposit.owner,
        (addressCounts.get(deposit.owner) || 0) + 1,
      );
    }

    for (const withdraw of withdrawals) {
      addressCounts.set(
        withdraw.owner,
        (addressCounts.get(withdraw.owner) || 0) + 1,
      );
    }

    const totalAddresses = addressCounts.size;
    const totalTxs = deposits.length + withdrawals.length;
    const avgTxsPerAddress = totalAddresses > 0 ? totalTxs / totalAddresses : 0;

    // Reuse rate: % of addresses used more than once
    let reusedAddresses = 0;
    for (const count of addressCounts.values()) {
      if (count > 1) reusedAddresses++;
    }

    const reuseRate = totalAddresses > 0 ? reusedAddresses / totalAddresses : 0;

    return {
      totalAddresses,
      avgTxsPerAddress,
      reuseRate,
      reusedAddresses,
    };
  }

  /**
   * Calculate composite privacy score (0-100)
   */
  private calculatePrivacyScore(
    matchedCount: number,
    depositCount: number,
    withdrawCount: number,
    amountMetrics: { exactMatchRate: number; uniqueAmountRatio: number },
    addressMetrics: { reuseRate: number; avgTxsPerAddress: number },
  ): number {
    let score = 100;

    // Linkability penalty (0-40 points)
    const linkabilityRate =
      withdrawCount > 0 ? matchedCount / withdrawCount : 0;
    score -= linkabilityRate * 40;

    // Low unique amount ratio penalty (0-20 points)
    // If amounts are not unique, they're easier to match
    score -= (1 - amountMetrics.uniqueAmountRatio) * 20;

    // Address reuse penalty (0-20 points)
    score -= amountMetrics.exactMatchRate * 20;

    // Addresses are ALWAYS visible - fixed penalty (20 points)
    score -= 20;

    return Math.max(0, Math.round(score));
  }

  /**
   * Identify vulnerabilities and recommendations
   */
  private identifyVulnerabilities(
    matches: CTMatch[],
    amountMetrics: {
      exactMatchRate: number;
      uniqueAmountRatio: number;
    },
    addressMetrics: {
      reuseRate: number;
      avgTxsPerAddress: number;
    },
  ) {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // CRITICAL: Addresses are always visible
    vulnerabilities.push(
      "CRITICAL: Sender and receiver addresses are ALWAYS visible on-chain!",
    );
    recommendations.push("Use multiple wallets to reduce address linkability.");

    // CRITICAL: Deposit/Withdraw amounts are public
    vulnerabilities.push(
      "CRITICAL: Deposit and Withdraw amounts are PUBLIC (not encrypted)!",
    );
    recommendations.push(
      "Only internal CT-to-CT transfers have encrypted amounts.",
    );

    // Amount matching vulnerability
    if (amountMetrics.exactMatchRate > 0.3) {
      vulnerabilities.push(
        `HIGH: ${(amountMetrics.exactMatchRate * 100).toFixed(1)}% of withdrawals can be matched to deposits by amount.`,
      );
      recommendations.push(
        "Use common/standardized amounts to increase anonymity set.",
      );
    }

    // Low amount diversity
    if (amountMetrics.uniqueAmountRatio > 0.5) {
      vulnerabilities.push(
        `MEDIUM: ${(amountMetrics.uniqueAmountRatio * 100).toFixed(1)}% of deposits have unique amounts (easy fingerprinting).`,
      );
      recommendations.push(
        "Avoid unique amounts - use round numbers that others also use.",
      );
    }

    // Address reuse
    if (addressMetrics.reuseRate > 0.3) {
      vulnerabilities.push(
        `HIGH: ${(addressMetrics.reuseRate * 100).toFixed(1)}% of addresses are reused multiple times.`,
      );
      recommendations.push(
        "Use fresh addresses for each deposit/withdraw cycle.",
      );
    }

    // High-confidence matches
    if (matches.length > 0) {
      const highConfidenceMatches = matches.filter(
        (m) => m.confidence > 70,
      ).length;
      if (highConfidenceMatches > matches.length * 0.3) {
        vulnerabilities.push(
          `CRITICAL: ${highConfidenceMatches} of ${matches.length} matches have >70% confidence.`,
        );
      }
    }

    return { vulnerabilities, recommendations };
  }

  /**
   * Generate human-readable summary
   */
  generateSummary(result: CTAnalysisResult): string {
    const lines: string[] = [];

    lines.push("\n" + "=".repeat(60));
    lines.push("Confidential Transfers Privacy Analysis");
    lines.push("=".repeat(60));
    lines.push("");
    lines.push(`PRIVACY SCORE: ${result.privacyScore}/100`);
    lines.push("");

    lines.push("Transaction Analysis:");
    lines.push(`- Total CT Deposits: ${result.totalDeposits}`);
    lines.push(`- Total CT Withdrawals: ${result.totalWithdrawals}`);
    lines.push(`- Matched Pairs: ${result.matchedPairs}`);
    lines.push(`- Linkability Rate: ${result.linkabilityRate.toFixed(1)}%`);
    lines.push(`- Average Confidence: ${result.avgConfidence.toFixed(1)}%`);
    lines.push("");

    lines.push("Amount Analysis:");
    lines.push(
      `- Exact Match Rate: ${(result.exactMatchRate * 100).toFixed(1)}%`,
    );
    lines.push(
      `- Unique Amount Ratio: ${(result.uniqueAmountRatio * 100).toFixed(1)}%`,
    );
    lines.push("");

    lines.push("Address Analysis:");
    lines.push(
      `- Address Reuse Rate: ${(result.addressReuseRate * 100).toFixed(1)}%`,
    );
    lines.push(`- Avg Txs Per Address: ${result.avgTxsPerAddress.toFixed(1)}`);
    lines.push("");

    lines.push("VULNERABILITIES:");
    for (const vuln of result.vulnerabilities) {
      lines.push(`  ${vuln}`);
    }
    lines.push("");

    lines.push("RECOMMENDATIONS:");
    for (const rec of result.recommendations) {
      lines.push(`  ${rec}`);
    }
    lines.push("");

    lines.push("KEY FINDING:");
    lines.push("  Confidential Transfers encrypt internal transfer amounts,");
    lines.push("  but Deposit and Withdraw operations have PUBLIC amounts!");
    lines.push("  This creates a timing correlation attack vector similar");
    lines.push("  to Privacy Cash, but with the added weakness that");
    lines.push("  sender/receiver addresses are ALWAYS visible.");
    lines.push("");

    return lines.join("\n");
  }
}

// CLI entry point
if (require.main === module) {
  // Demo with synthetic data
  const attack = new CTTimingCorrelationAttack();

  // Create sample data
  const now = Date.now();
  const sampleDeposits: CTDeposit[] = [
    {
      id: 1,
      signature: "deposit1",
      timestamp: now - 24 * 60 * 60 * 1000, // 24 hours ago
      slot: 1000,
      mint: "USDC",
      owner: "user1",
      tokenAccount: "account1",
      amount: 1000000, // 1 USDC
      decimals: 6,
    },
    {
      id: 2,
      signature: "deposit2",
      timestamp: now - 12 * 60 * 60 * 1000, // 12 hours ago
      slot: 2000,
      mint: "USDC",
      owner: "user2",
      tokenAccount: "account2",
      amount: 5000000, // 5 USDC
      decimals: 6,
    },
  ];

  const sampleWithdrawals: CTWithdraw[] = [
    {
      id: 1,
      signature: "withdraw1",
      timestamp: now - 2 * 60 * 60 * 1000, // 2 hours ago
      slot: 3000,
      mint: "USDC",
      owner: "user3", // Different owner, but same amount!
      tokenAccount: "account3",
      amount: 1000000, // 1 USDC - matches deposit1
      decimals: 6,
    },
    {
      id: 2,
      signature: "withdraw2",
      timestamp: now, // Now
      slot: 4000,
      mint: "USDC",
      owner: "user2", // Same owner as deposit2!
      tokenAccount: "account2",
      amount: 5000000, // 5 USDC - matches deposit2
      decimals: 6,
    },
  ];

  const result = attack.analyze(sampleDeposits, sampleWithdrawals);
  console.log(attack.generateSummary(result));
}
