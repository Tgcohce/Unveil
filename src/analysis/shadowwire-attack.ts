/**
 * ShadowWire Privacy Analysis
 *
 * CRITICAL INSIGHT:
 * ShadowWire hides AMOUNTS (using Bulletproofs) but reveals ADDRESSES.
 * This is the OPPOSITE of Privacy Cash (hides addresses, reveals amounts).
 *
 * Attack Strategy:
 * 1. Timing Correlation: Match deposits/withdrawals by timing (works even without amounts!)
 * 2. Address Clustering: Group transfers by address patterns
 * 3. Graph Analysis: Build transaction graph since addresses are visible
 * 4. Amount Inference: Even though amounts are hidden, patterns reveal ranges
 *
 * Why This is WORSE Than Privacy Cash:
 * - Privacy Cash: 68% linkable via timing + amounts
 * - ShadowWire: Likely >80% linkable via timing + addresses!
 * - Addresses provide MORE information than amounts for correlation
 *
 * $15K Bounty Justification:
 * - Demonstrates that Bulletproofs alone are insufficient
 * - Address visibility defeats privacy regardless of amount hiding
 * - Shows need for BOTH address AND amount privacy
 */

import { ShadowWireTransfer, ShadowWireAccount } from "../indexer/types";

export interface ShadowWireAttackMatch {
  sender: string;
  recipient: string;
  timestamp: number;
  signature: string;
  confidence: number; // 0-100%
  matchReason: string[];
  anonymitySet: number; // How many other transfers could match
}

export interface ShadowWireAnalysisResult {
  protocol: "ShadowWire";
  programId: string;
  privacyScore: number; // 0-100

  // Attack metrics
  totalTransfers: number;
  linkableTransfers: number;
  linkabilityRate: number; // % of transfers that can be linked

  // Address analysis
  uniqueUsers: number;
  addressReuseRate: number; // % of addresses used multiple times
  avgTransfersPerAddress: number;

  // Timing analysis
  timingEntropy: number; // 0-1, lower = more predictable
  avgTimeBetweenTransfers: number; // milliseconds
  timingClusteringScore: number; // 0-1, higher = more clustered

  // Anonymity sets
  avgAnonymitySet: number;
  medianAnonymitySet: number;
  minAnonymitySet: number;

  // Vulnerabilities
  criticalVulnerabilities: number;
  vulnerabilities: string[];
  recommendations: string[];

  // Comparison to other protocols
  betterThanPrivacyCash: boolean;
  betterThanConfidentialTransfers: boolean;

  // Attack results
  matches: ShadowWireAttackMatch[];
}

export class ShadowWireAttack {
  /**
   * Run comprehensive privacy analysis on ShadowWire
   *
   * KEY DIFFERENCE from Privacy Cash:
   * - Privacy Cash: We match by (amount, timing) → link deposits to withdrawals
   * - ShadowWire: We match by (address, timing) → link senders to recipients
   *
   * ShadowWire is MORE vulnerable because:
   * - Addresses provide more entropy than amounts (more unique)
   * - Graph analysis works (can't do this with Privacy Cash)
   * - Clustering is easier with visible addresses
   */
  analyze(
    transfers: ShadowWireTransfer[],
    accounts: Map<string, ShadowWireAccount>,
  ): ShadowWireAnalysisResult {
    console.log(`\nAnalyzing ${transfers.length} ShadowWire transfers...`);

    // 1. Address analysis
    const addressMetrics = this.analyzeAddresses(accounts);

    // 2. Timing analysis
    const timingMetrics = this.analyzeTiming(transfers);

    // 3. Run timing correlation attack
    const matches = this.timingCorrelationAttack(transfers);

    // 4. Calculate anonymity sets
    const anonymityMetrics = this.calculateAnonymitySets(transfers, matches);

    // 5. Calculate privacy score
    const privacyScore = this.calculatePrivacyScore(
      addressMetrics,
      timingMetrics,
      anonymityMetrics,
      matches.length / Math.max(transfers.length, 1),
    );

    // 6. Identify vulnerabilities
    const { vulnerabilities, recommendations } = this.identifyVulnerabilities(
      addressMetrics,
      timingMetrics,
      anonymityMetrics,
      matches.length / Math.max(transfers.length, 1),
    );

    const criticalVulnerabilities = vulnerabilities.filter((v) =>
      v.includes("CRITICAL"),
    ).length;

    return {
      protocol: "ShadowWire",
      programId: "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU", // Pool PDA
      privacyScore,

      totalTransfers: transfers.length,
      linkableTransfers: matches.length,
      linkabilityRate: (matches.length / Math.max(transfers.length, 1)) * 100,

      uniqueUsers: accounts.size,
      addressReuseRate: addressMetrics.reuseRate,
      avgTransfersPerAddress: addressMetrics.avgTransfers,

      timingEntropy: timingMetrics.entropy,
      avgTimeBetweenTransfers: timingMetrics.avgTimeBetween,
      timingClusteringScore: timingMetrics.clustering,

      avgAnonymitySet: anonymityMetrics.avg,
      medianAnonymitySet: anonymityMetrics.median,
      minAnonymitySet: anonymityMetrics.min,

      criticalVulnerabilities,
      vulnerabilities,
      recommendations,

      // Compare to other protocols
      betterThanPrivacyCash: privacyScore > 16, // Privacy Cash scored 16/100
      betterThanConfidentialTransfers: true, // CT has 0% adoption

      matches,
    };
  }

  /**
   * Analyze address usage patterns
   *
   * Since addresses are VISIBLE, we can see:
   * - Which addresses are reused (bad for privacy)
   * - Transaction graphs (who sends to whom)
   * - Clustering patterns
   */
  private analyzeAddresses(accounts: Map<string, ShadowWireAccount>) {
    const totalAccounts = accounts.size;
    let reuseCount = 0;
    let totalTransfers = 0;

    for (const account of accounts.values()) {
      if (account.totalTransfers > 1) {
        reuseCount++;
      }
      totalTransfers += account.totalTransfers;
    }

    return {
      reuseRate: (reuseCount / Math.max(totalAccounts, 1)) * 100,
      avgTransfers: totalTransfers / Math.max(totalAccounts, 1),
    };
  }

  /**
   * Analyze timing patterns
   *
   * Even without amounts, timing reveals patterns:
   * - Do transfers happen at predictable times?
   * - Are there clusters (e.g., hourly batches)?
   * - Is there enough randomness?
   */
  private analyzeTiming(transfers: ShadowWireTransfer[]) {
    if (transfers.length === 0) {
      return { entropy: 0, avgTimeBetween: 0, clustering: 0 };
    }

    // Sort by timestamp
    const sorted = transfers.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate time deltas
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      deltas.push(sorted[i].timestamp - sorted[i - 1].timestamp);
    }

    const avgTimeBetween =
      deltas.length > 0
        ? deltas.reduce((sum, d) => sum + d, 0) / deltas.length
        : 0;

    // Calculate entropy (Shannon entropy of hourly buckets)
    const hourlyBuckets = new Map<number, number>();
    for (const transfer of transfers) {
      const hour = Math.floor(transfer.timestamp / (1000 * 60 * 60));
      hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
    }

    let entropy = 0;
    const total = transfers.length;
    for (const count of hourlyBuckets.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    // Normalize entropy (0-1)
    const maxEntropy = Math.log2(hourlyBuckets.size);
    entropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Calculate clustering (coefficient of variation)
    const mean =
      deltas.reduce((sum, d) => sum + d, 0) / Math.max(deltas.length, 1);
    const variance =
      deltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
      Math.max(deltas.length, 1);
    const stdDev = Math.sqrt(variance);
    const clustering = mean > 0 ? stdDev / mean : 0;

    return {
      entropy,
      avgTimeBetween,
      clustering: Math.min(clustering, 1), // Clamp to 0-1
    };
  }

  /**
   * Timing correlation attack
   *
   * STRATEGY: Even without amounts, we can correlate by:
   * 1. Address patterns (sender/recipient pairs)
   * 2. Timing windows (transfers happening close together)
   * 3. Activity patterns (same addresses, similar timing)
   *
   * This is EASIER than Privacy Cash because addresses are visible!
   */
  private timingCorrelationAttack(
    transfers: ShadowWireTransfer[],
  ): ShadowWireAttackMatch[] {
    const matches: ShadowWireAttackMatch[] = [];

    // Build address activity map
    const senderActivity = new Map<string, ShadowWireTransfer[]>();
    const recipientActivity = new Map<string, ShadowWireTransfer[]>();

    for (const transfer of transfers) {
      if (!senderActivity.has(transfer.sender)) {
        senderActivity.set(transfer.sender, []);
      }
      senderActivity.get(transfer.sender)!.push(transfer);

      if (!recipientActivity.has(transfer.recipient)) {
        recipientActivity.set(transfer.recipient, []);
      }
      recipientActivity.get(transfer.recipient)!.push(transfer);
    }

    // For each sender, look for correlated recipients
    for (const [sender, senderTxs] of senderActivity) {
      for (const senderTx of senderTxs) {
        // Look for recipients with activity in similar time windows
        const timeWindow = 5 * 60 * 1000; // 5 minutes

        for (const [recipient, recipientTxs] of recipientActivity) {
          if (sender === recipient) continue;

          for (const recipientTx of recipientTxs) {
            const timeDelta = Math.abs(
              recipientTx.timestamp - senderTx.timestamp,
            );

            if (timeDelta <= timeWindow) {
              const matchReasons: string[] = [];
              let confidence = 50; // Base confidence

              // Same timing window
              matchReasons.push(
                `Timing: ${Math.floor(timeDelta / 1000)}s apart`,
              );
              confidence += 30;

              // Check if this is a repeated pattern (same sender→recipient)
              const priorMatches = senderTxs.filter(
                (tx) => tx.recipient === recipient,
              );
              if (priorMatches.length > 1) {
                matchReasons.push(`Repeated pattern (${priorMatches.length}x)`);
                confidence += 20;
              }

              // Calculate anonymity set (how many other potential matches)
              const potentialMatches = transfers.filter(
                (tx) =>
                  Math.abs(tx.timestamp - senderTx.timestamp) <= timeWindow &&
                  tx.sender !== sender,
              );

              matches.push({
                sender,
                recipient,
                timestamp: senderTx.timestamp,
                signature: senderTx.signature,
                confidence: Math.min(confidence, 100),
                matchReason: matchReasons,
                anonymitySet: potentialMatches.length,
              });
            }
          }
        }
      }
    }

    return matches;
  }

  /**
   * Calculate anonymity sets
   */
  private calculateAnonymitySets(
    transfers: ShadowWireTransfer[],
    matches: ShadowWireAttackMatch[],
  ) {
    if (matches.length === 0) {
      return { avg: transfers.length, median: transfers.length, min: 0 };
    }

    const anonymitySets = matches.map((m) => m.anonymitySet);
    anonymitySets.sort((a, b) => a - b);

    const avg =
      anonymitySets.reduce((sum, val) => sum + val, 0) /
      Math.max(anonymitySets.length, 1);
    const median = anonymitySets[Math.floor(anonymitySets.length / 2)] || avg;
    const min = anonymitySets[0] || 0;

    return { avg, median, min };
  }

  /**
   * Calculate composite privacy score (0-100)
   *
   * Lower is worse. Factors:
   * - Address reuse rate (lower is better)
   * - Timing entropy (higher is better)
   * - Anonymity sets (higher is better)
   * - Linkability rate (lower is better)
   */
  private calculatePrivacyScore(
    addressMetrics: { reuseRate: number; avgTransfers: number },
    timingMetrics: { entropy: number; clustering: number },
    anonymityMetrics: { avg: number; median: number; min: number },
    linkabilityRate: number,
  ): number {
    let score = 100;

    // Address reuse penalty (0-30 points)
    score -= Math.min(addressMetrics.reuseRate / 3, 30);

    // Timing entropy penalty (0-20 points)
    score -= (1 - timingMetrics.entropy) * 20;

    // Low anonymity set penalty (0-25 points)
    const avgAnonSet = anonymityMetrics.avg;
    if (avgAnonSet < 2) score -= 25;
    else if (avgAnonSet < 5) score -= 20;
    else if (avgAnonSet < 10) score -= 15;
    else if (avgAnonSet < 20) score -= 10;

    // Linkability penalty (0-25 points)
    score -= linkabilityRate * 25;

    return Math.max(0, Math.round(score));
  }

  /**
   * Identify vulnerabilities and recommendations
   */
  private identifyVulnerabilities(
    addressMetrics: { reuseRate: number; avgTransfers: number },
    timingMetrics: { entropy: number; clustering: number },
    anonymityMetrics: { avg: number },
    linkabilityRate: number,
  ) {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // CRITICAL: Addresses are visible
    vulnerabilities.push(
      "⚠️ CRITICAL: Sender and recipient addresses are VISIBLE on-chain!",
    );
    vulnerabilities.push(
      "⚠️ CRITICAL: Transaction graph can be analyzed (unlike Privacy Cash)",
    );
    recommendations.push(
      "💡 Use Privacy Cash or mixing protocols to hide addresses",
    );
    recommendations.push(
      "💡 Bulletproofs alone are insufficient - need address privacy too",
    );

    // Address reuse
    if (addressMetrics.reuseRate > 50) {
      vulnerabilities.push(
        `⚠️ HIGH: ${Math.round(addressMetrics.reuseRate)}% of addresses reused - easy to cluster!`,
      );
      recommendations.push(
        "💡 Use fresh addresses for each transfer (like Bitcoin)",
      );
    }

    // Timing patterns
    if (timingMetrics.entropy < 0.5) {
      vulnerabilities.push(
        `⚠️ HIGH: Low timing entropy (${timingMetrics.entropy.toFixed(2)}) - predictable patterns!`,
      );
      recommendations.push(
        "💡 Add random delays before transfers (1-24 hours)",
      );
    }

    // Low anonymity sets
    if (anonymityMetrics.avg < 5) {
      vulnerabilities.push(
        `⚠️ HIGH: Average anonymity set is ${Math.round(anonymityMetrics.avg)} - very easy to correlate!`,
      );
      recommendations.push("💡 Wait for more pool activity before withdrawing");
    }

    // High linkability
    if (linkabilityRate > 0.5) {
      vulnerabilities.push(
        `⚠️ CRITICAL: ${Math.round(linkabilityRate * 100)}% of transfers can be linked via timing correlation!`,
      );
      recommendations.push(
        "💡 This protocol is vulnerable to timing attacks despite Bulletproofs",
      );
    }

    return { vulnerabilities, recommendations };
  }

  /**
   * Generate human-readable summary
   */
  generateSummary(result: ShadowWireAnalysisResult): string {
    const lines: string[] = [];

    lines.push("\n" + "=".repeat(60));
    lines.push("ShadowWire Privacy Analysis");
    lines.push("=".repeat(60));
    lines.push("");
    lines.push(`PRIVACY SCORE: ${result.privacyScore}/100`);
    lines.push("");

    lines.push("Protocol Comparison:");
    lines.push(`- Privacy Cash: 16/100 (hides addresses, reveals amounts)`);
    lines.push(
      `- ShadowWire: ${result.privacyScore}/100 (hides amounts, reveals addresses)`,
    );
    lines.push(
      `- Confidential Transfers: N/A (0% adoption, addresses visible)`,
    );
    lines.push("");

    lines.push("Address Privacy:");
    lines.push(`- Addresses: VISIBLE (major weakness!)`);
    lines.push(`- Address reuse rate: ${Math.round(result.addressReuseRate)}%`);
    lines.push(
      `- Avg transfers per address: ${result.avgTransfersPerAddress.toFixed(1)}`,
    );
    lines.push("");

    lines.push("Amount Privacy:");
    lines.push(`- Amounts: HIDDEN (Bulletproofs)`);
    lines.push(
      `- But timing + addresses still leak ${Math.round(result.linkabilityRate)}% of transfers!`,
    );
    lines.push("");

    lines.push("Timing Privacy:");
    lines.push(
      `- Timing entropy: ${result.timingEntropy.toFixed(2)} (0-1, higher is better)`,
    );
    lines.push(
      `- Clustering: ${Math.round(result.timingClusteringScore * 100)}%`,
    );
    lines.push("");

    lines.push("Anonymity Sets:");
    lines.push(`- Average: ${result.avgAnonymitySet.toFixed(1)}`);
    lines.push(`- Median: ${result.medianAnonymitySet}`);
    lines.push(`- Minimum: ${result.minAnonymitySet}`);
    lines.push("");

    lines.push("Attack Results:");
    lines.push(`- Total transfers: ${result.totalTransfers}`);
    lines.push(`- Linkable transfers: ${result.linkableTransfers}`);
    lines.push(`- Linkability rate: ${Math.round(result.linkabilityRate)}%`);
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
    lines.push(
      "  ⚠️ Bulletproofs hide amounts but visible addresses defeat privacy!",
    );
    lines.push("  ⚠️ Need BOTH address AND amount privacy for true anonymity!");
    lines.push("  ⚠️ Neither Privacy Cash nor ShadowWire alone is sufficient!");
    lines.push("");

    return lines.join("\n");
  }
}
