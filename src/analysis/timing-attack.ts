/**
 * Timing Correlation Attack Module
 *
 * Attempts to link withdrawals to deposits based on timing patterns.
 * This demonstrates a real privacy vulnerability in mixing protocols.
 */

import { Deposit, Withdrawal } from "../indexer/types";

export interface TimingAttackResult {
  withdrawal: Withdrawal;
  likelySources: Array<{
    deposit: Deposit;
    confidence: number; // 0-1
    timeDelta: number; // milliseconds
    reasoning: string[];
  }>;
  anonymitySet: number; // How many possible sources
  vulnerabilityLevel: "critical" | "high" | "medium" | "low";
}

export interface TimingAttackSummary {
  totalWithdrawals: number;
  criticalVulnerabilities: number; // Anonymity set = 1
  highVulnerabilities: number; // Anonymity set 2-5
  mediumVulnerabilities: number; // Anonymity set 6-20
  lowVulnerabilities: number; // Anonymity set > 20
  averageAnonymitySet: number;
  attackSuccessRate: number; // % of withdrawals with <5 anonymity set
}

export class TimingCorrelationAttack {
  // Timing windows for analysis (in milliseconds)
  // REALITY: Privacy Cash users withdraw almost immediately (within minutes!)
  private readonly MIN_DELAY = 0; // No minimum delay (immediate withdrawals observed)
  private readonly MAX_DELAY = 30 * 24 * 3600 * 1000; // 30 days
  private readonly TYPICAL_MIN = 0; // Immediate
  private readonly TYPICAL_MAX = 7 * 24 * 3600 * 1000; // 7 days

  // Fee tolerance: Withdrawal should be 95-101% of deposit
  private readonly FEE_TOLERANCE_MIN = 0.95;
  private readonly FEE_TOLERANCE_MAX = 1.01;

  /**
   * Analyze a single withdrawal for timing correlation vulnerabilities
   */
  analyzeWithdrawal(
    withdrawal: Withdrawal,
    allDeposits: Deposit[],
  ): TimingAttackResult {
    // Step 1: Filter deposits by amount (with fee tolerance)
    let candidates = allDeposits.filter((d) => {
      const ratio = withdrawal.amount / d.amount;
      return ratio >= this.FEE_TOLERANCE_MIN && ratio <= this.FEE_TOLERANCE_MAX;
    });

    // Step 2: Filter by timing (must be before withdrawal)
    candidates = candidates.filter((d) => d.timestamp < withdrawal.timestamp);

    // Step 3: Skip spent filter - Privacy Cash doesn't reveal which deposits are spent
    // (All nullifiers are "unknown", so we can't track spent status)
    // candidates = candidates.filter((d) => !d.spent);

    // Step 4: Apply timing window constraints
    const candidatesInWindow = candidates.filter((d) => {
      const delta = withdrawal.timestamp - d.timestamp;
      return delta >= this.MIN_DELAY && delta <= this.MAX_DELAY;
    });

    // Step 5: Analyze timing patterns
    const likelySources = candidatesInWindow.map((deposit) => {
      const timeDelta = withdrawal.timestamp - deposit.timestamp;
      const confidence = this.calculateConfidence(
        deposit,
        withdrawal,
        candidatesInWindow.length,
        timeDelta,
      );

      const reasoning = this.generateReasoning(
        timeDelta,
        candidatesInWindow.length,
        allDeposits.length,
      );

      return {
        deposit,
        confidence,
        timeDelta,
        reasoning,
      };
    });

    // Sort by confidence (highest first)
    likelySources.sort((a, b) => b.confidence - a.confidence);

    // Determine vulnerability level
    const anonymitySet = candidatesInWindow.length;
    let vulnerabilityLevel: "critical" | "high" | "medium" | "low";

    if (anonymitySet === 0) {
      vulnerabilityLevel = "critical"; // No matching deposits! Something wrong
    } else if (anonymitySet === 1) {
      vulnerabilityLevel = "critical"; // ONLY ONE possible source!
    } else if (anonymitySet <= 5) {
      vulnerabilityLevel = "high"; // Very small anonymity set
    } else if (anonymitySet <= 20) {
      vulnerabilityLevel = "medium"; // Small anonymity set
    } else {
      vulnerabilityLevel = "low"; // Good anonymity set
    }

    return {
      withdrawal,
      likelySources,
      anonymitySet,
      vulnerabilityLevel,
    };
  }

  /**
   * Calculate confidence score for a deposit-withdrawal link
   */
  private calculateConfidence(
    deposit: Deposit,
    withdrawal: Withdrawal,
    anonymitySetSize: number,
    timeDelta: number,
  ): number {
    let confidence = 0;

    // Base confidence from anonymity set size
    if (anonymitySetSize === 1) {
      confidence = 0.95; // Very high confidence if only 1 candidate
    } else if (anonymitySetSize <= 5) {
      confidence = 0.7; // High confidence for small sets
    } else if (anonymitySetSize <= 20) {
      confidence = 0.4; // Medium confidence
    } else {
      confidence = 0.2; // Low confidence for large sets
    }

    // Adjust based on timing patterns
    // If timing is very typical (e.g., exactly 24h), increase confidence
    const hoursDelay = timeDelta / (3600 * 1000);
    if (Math.abs(hoursDelay - 24) < 0.5) {
      confidence += 0.1; // Exactly 24h -> suspicious
    } else if (Math.abs(hoursDelay - 48) < 0.5) {
      confidence += 0.08; // Exactly 48h -> suspicious
    } else if (Math.abs(hoursDelay - 168) < 1) {
      confidence += 0.06; // Exactly 1 week -> suspicious
    }

    // Adjust based on amount rarity
    // (Would need access to full amount distribution)

    // Cap at 0.99 (never 100% certain without proof)
    return Math.min(confidence, 0.99);
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    timeDelta: number,
    anonymitySetSize: number,
    totalDeposits: number,
  ): string[] {
    const reasoning: string[] = [];
    const hours = Math.floor(timeDelta / (3600 * 1000));
    const days = Math.floor(hours / 24);

    // Anonymity set analysis
    if (anonymitySetSize === 1) {
      reasoning.push(
        `🚨 CRITICAL: Only 1 deposit matches (100% uniquely identifiable!)`,
      );
    } else if (anonymitySetSize <= 5) {
      reasoning.push(
        `⚠️ HIGH RISK: Only ${anonymitySetSize} possible sources (easy to narrow down)`,
      );
    } else if (anonymitySetSize <= 20) {
      reasoning.push(
        `⚠️ MEDIUM RISK: ${anonymitySetSize} possible sources (limited privacy)`,
      );
    } else {
      reasoning.push(
        `✅ LOW RISK: ${anonymitySetSize} possible sources (good privacy)`,
      );
    }

    // Timing analysis
    if (days === 0) {
      reasoning.push(`⏱️ Withdrawn same day (${hours}h delay)`);
    } else if (days === 1 && hours >= 23 && hours <= 25) {
      reasoning.push(`⏱️ Withdrawn exactly ~24h later (predictable pattern!)`);
    } else if (days === 2 && hours >= 47 && hours <= 49) {
      reasoning.push(`⏱️ Withdrawn exactly ~48h later (predictable pattern!)`);
    } else if (days === 7 && hours >= 167 && hours <= 169) {
      reasoning.push(
        `⏱️ Withdrawn exactly ~1 week later (predictable pattern!)`,
      );
    } else {
      reasoning.push(`⏱️ Withdrawn ${days}d ${hours % 24}h later`);
    }

    // Context
    reasoning.push(
      `📊 ${anonymitySetSize} matching deposits out of ${totalDeposits} total`,
    );

    return reasoning;
  }

  /**
   * Analyze all withdrawals and generate summary
   */
  analyzeAll(
    withdrawals: Withdrawal[],
    deposits: Deposit[],
  ): {
    results: TimingAttackResult[];
    summary: TimingAttackSummary;
  } {
    const results = withdrawals.map((w) => this.analyzeWithdrawal(w, deposits));

    // Generate summary
    const critical = results.filter(
      (r) => r.vulnerabilityLevel === "critical",
    ).length;
    const high = results.filter((r) => r.vulnerabilityLevel === "high").length;
    const medium = results.filter(
      (r) => r.vulnerabilityLevel === "medium",
    ).length;
    const low = results.filter((r) => r.vulnerabilityLevel === "low").length;

    const avgAnonymitySet =
      results.reduce((sum, r) => sum + r.anonymitySet, 0) / results.length || 0;

    const attackSuccessRate = ((critical + high) / results.length) * 100 || 0;

    const summary: TimingAttackSummary = {
      totalWithdrawals: results.length,
      criticalVulnerabilities: critical,
      highVulnerabilities: high,
      mediumVulnerabilities: medium,
      lowVulnerabilities: low,
      averageAnonymitySet: avgAnonymitySet,
      attackSuccessRate,
    };

    return { results, summary };
  }

  /**
   * Find the most vulnerable withdrawals
   */
  findMostVulnerable(
    results: TimingAttackResult[],
    limit = 10,
  ): TimingAttackResult[] {
    return results
      .filter(
        (r) =>
          r.vulnerabilityLevel === "critical" ||
          r.vulnerabilityLevel === "high",
      )
      .sort((a, b) => a.anonymitySet - b.anonymitySet)
      .slice(0, limit);
  }

  /**
   * Generate recommendations for users
   */
  generateRecommendations(summary: TimingAttackSummary): string[] {
    const recommendations: string[] = [];

    if (summary.attackSuccessRate > 50) {
      recommendations.push(
        "🚨 CRITICAL: Over 50% of withdrawals are vulnerable to timing attacks!",
      );
      recommendations.push(
        "💡 Users should wait random delays (e.g., 3-30 days) before withdrawing",
      );
    }

    if (summary.averageAnonymitySet < 10) {
      recommendations.push(
        "⚠️ Average anonymity set is very small (<10 deposits)",
      );
      recommendations.push(
        "💡 Encourage more users to deposit at common amounts",
      );
    }

    if (summary.criticalVulnerabilities > 0) {
      recommendations.push(
        `🚨 ${summary.criticalVulnerabilities} withdrawals have anonymity set of 1 (fully linkable!)`,
      );
      recommendations.push("💡 Users MUST avoid unique deposit amounts");
    }

    // General recommendations
    recommendations.push("✅ Use common amounts (5, 10, 20 SOL)");
    recommendations.push(
      "✅ Wait variable time periods (avoid patterns like 24h)",
    );
    recommendations.push("✅ Withdraw during high-activity periods");
    recommendations.push("✅ Use fresh addresses for withdrawals");

    return recommendations;
  }
}
