/**
 * Confidential Transfers Analysis Module
 *
 * Analyzes privacy properties of Solana's Confidential Transfers (Token-2022)
 *
 * Unlike Privacy Cash, we can't do amount matching (amounts are encrypted).
 * Instead we analyze:
 * 1. Address reuse patterns
 * 2. Timing patterns
 * 3. Auditor centralization
 * 4. Public/confidential correlation
 */

import {
  ConfidentialTransfer,
  ConfidentialAccount,
  ConfidentialMint,
  ConfidentialAnalysisResult,
} from "../indexer/types";

export class ConfidentialTransferAnalysis {
  /**
   * Main analysis function
   */
  analyze(
    transfers: ConfidentialTransfer[],
    accounts: Map<string, ConfidentialAccount>,
    mints: Map<string, ConfidentialMint>,
  ): ConfidentialAnalysisResult {
    console.log(`Analyzing ${transfers.length} confidential transfers...`);

    // 1. Address reuse analysis
    const addressReuse = this.analyzeAddressReuse(accounts);

    // 2. Timing analysis
    const timing = this.analyzeTimingPatterns(transfers);

    // 3. Auditor centralization
    const auditors = this.analyzeAuditorCentralization(mints, transfers);

    // 4. Public/confidential correlation
    const correlation = this.analyzePublicPrivateCorrelation(accounts);

    // Calculate composite privacy score
    const privacyScore = this.calculatePrivacyScore(
      addressReuse,
      timing,
      auditors,
      correlation,
    );

    // Generate vulnerabilities and recommendations
    const vulnerabilities = this.identifyVulnerabilities(
      addressReuse,
      timing,
      auditors,
      correlation,
    );

    const recommendations = this.generateRecommendations(vulnerabilities);

    return {
      addressReuseRate: addressReuse.reuseRate,
      avgTxsPerAddress: addressReuse.avgTxsPerAddress,
      publicPrivateMixRate: correlation.mixRate,
      timingEntropy: timing.entropy,
      avgTimeBetweenTxs: timing.avgTimeBetween,
      timingClustering: timing.clustering,
      mintsWithAuditors: auditors.mintsWithAuditors,
      uniqueAuditors: auditors.uniqueAuditors,
      auditorCentralization: auditors.centralization,
      avgTimeConfidential: correlation.avgTimeConfidential,
      immediateConversionRate: correlation.immediateConversionRate,
      privacyScore,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * 1. Address Reuse Analysis
   *
   * If users reuse addresses across multiple CTs, it defeats the purpose.
   * We can link all their transactions together!
   */
  private analyzeAddressReuse(accounts: Map<string, ConfidentialAccount>): {
    reuseRate: number;
    avgTxsPerAddress: number;
    accountsWithMultipleTxs: number;
  } {
    let totalTxs = 0;
    let accountsWithMultipleTxs = 0;

    for (const account of Array.from(accounts.values())) {
      totalTxs += account.totalConfidentialTxs;
      if (account.totalConfidentialTxs > 1) {
        accountsWithMultipleTxs++;
      }
    }

    const reuseRate = accountsWithMultipleTxs / Math.max(accounts.size, 1);
    const avgTxsPerAddress = totalTxs / Math.max(accounts.size, 1);

    return {
      reuseRate,
      avgTxsPerAddress,
      accountsWithMultipleTxs,
    };
  }

  /**
   * 2. Timing Pattern Analysis
   *
   * Do CTs happen at predictable times? (e.g., every day at 9am)
   * Calculate Shannon entropy of timing distribution
   */
  private analyzeTimingPatterns(transfers: ConfidentialTransfer[]): {
    entropy: number;
    avgTimeBetween: number;
    clustering: number;
  } {
    if (transfers.length < 2) {
      return { entropy: 0, avgTimeBetween: 0, clustering: 0 };
    }

    // Sort by timestamp
    const sorted = [...transfers].sort((a, b) => a.timestamp - b.timestamp);

    // Calculate time deltas
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      deltas.push(sorted[i].timestamp - sorted[i - 1].timestamp);
    }

    const avgTimeBetween =
      deltas.reduce((sum, d) => sum + d, 0) / deltas.length;

    // Calculate entropy of hourly distribution
    const hourBuckets = new Map<number, number>();
    for (const transfer of transfers) {
      const hour = new Date(transfer.timestamp).getUTCHours();
      hourBuckets.set(hour, (hourBuckets.get(hour) || 0) + 1);
    }

    let entropy = 0;
    const total = transfers.length;
    for (const count of Array.from(hourBuckets.values())) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    // Normalize entropy (max is log2(24) = 4.585)
    const maxEntropy = Math.log2(24);
    const normalizedEntropy = entropy / maxEntropy;

    // Clustering: std dev of time deltas
    const mean = avgTimeBetween;
    const variance =
      deltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deltas.length;
    const stdDev = Math.sqrt(variance);

    // High clustering = low std dev relative to mean
    const clustering = 1 - Math.min(stdDev / mean, 1);

    return {
      entropy: normalizedEntropy,
      avgTimeBetween,
      clustering,
    };
  }

  /**
   * 3. Auditor Centralization Analysis
   *
   * If one entity controls auditor keys for many mints, they can decrypt
   * ALL amounts - major centralization risk!
   */
  private analyzeAuditorCentralization(
    mints: Map<string, ConfidentialMint>,
    transfers: ConfidentialTransfer[],
  ): {
    mintsWithAuditors: number;
    uniqueAuditors: number;
    centralization: number;
  } {
    const auditorKeys = new Map<string, number>(); // auditor -> mint count
    let mintsWithAuditors = 0;

    for (const mint of Array.from(mints.values())) {
      if (mint.auditorKey) {
        mintsWithAuditors++;
        auditorKeys.set(
          mint.auditorKey,
          (auditorKeys.get(mint.auditorKey) || 0) + 1,
        );
      }
    }

    const uniqueAuditors = auditorKeys.size;

    // Centralization: if 1 auditor controls many mints, centralization is high
    let centralization = 0;
    if (uniqueAuditors > 0) {
      const maxMintsPerAuditor = Math.max(...Array.from(auditorKeys.values()));
      centralization = maxMintsPerAuditor / mints.size;
    }

    return {
      mintsWithAuditors,
      uniqueAuditors,
      centralization,
    };
  }

  /**
   * 4. Public/Confidential Correlation Analysis
   *
   * Do users convert public → confidential → public quickly?
   * This leaks information about amounts!
   */
  private analyzePublicPrivateCorrelation(
    accounts: Map<string, ConfidentialAccount>,
  ): {
    mixRate: number;
    avgTimeConfidential: number;
    immediateConversionRate: number;
  } {
    let accountsWithPublicUse = 0;
    let totalTimeConfidential = 0;
    let accountsWithImmediateConversion = 0;

    for (const account of Array.from(accounts.values())) {
      if (account.alsoUsedPublic) {
        accountsWithPublicUse++;
      }

      const timeConfidential =
        account.lastConfidentialTx - account.firstConfidentialTx;
      totalTimeConfidential += timeConfidential;

      // Immediate conversion = less than 1 hour
      if (timeConfidential < 3600 * 1000) {
        accountsWithImmediateConversion++;
      }
    }

    const mixRate = accountsWithPublicUse / Math.max(accounts.size, 1);
    const avgTimeConfidential =
      totalTimeConfidential / Math.max(accounts.size, 1);
    const immediateConversionRate =
      accountsWithImmediateConversion / Math.max(accounts.size, 1);

    return {
      mixRate,
      avgTimeConfidential,
      immediateConversionRate,
    };
  }

  /**
   * Calculate composite privacy score (0-100)
   *
   * Higher is better. Components:
   * - Address reuse (30%)
   * - Timing entropy (20%)
   * - Auditor decentralization (30%)
   * - Public/private separation (20%)
   */
  private calculatePrivacyScore(
    addressReuse: any,
    timing: any,
    auditors: any,
    correlation: any,
  ): number {
    // Address reuse: lower reuse = better (invert)
    const addressScore = (1 - addressReuse.reuseRate) * 30;

    // Timing entropy: higher = better
    const timingScore = timing.entropy * 20;

    // Auditor decentralization: lower centralization = better (invert)
    const auditorScore = (1 - auditors.centralization) * 30;

    // Public/private separation: lower mix rate = better (invert)
    const correlationScore = (1 - correlation.mixRate) * 20;

    return Math.round(
      addressScore + timingScore + auditorScore + correlationScore,
    );
  }

  /**
   * Identify specific vulnerabilities
   */
  private identifyVulnerabilities(
    addressReuse: any,
    timing: any,
    auditors: any,
    correlation: any,
  ): string[] {
    const vulnerabilities: string[] = [];

    // Critical: Address reuse
    if (addressReuse.reuseRate > 0.5) {
      vulnerabilities.push(
        `🚨 CRITICAL: ${Math.round(addressReuse.reuseRate * 100)}% of addresses reused multiple times - all transactions linkable!`,
      );
    }

    // High: Auditor centralization
    if (auditors.centralization > 0.5) {
      vulnerabilities.push(
        `⚠️ HIGH: ${Math.round(auditors.centralization * 100)}% of mints controlled by single auditor - can decrypt ALL amounts!`,
      );
    }

    // High: Public/private mixing
    if (correlation.mixRate > 0.3) {
      vulnerabilities.push(
        `⚠️ HIGH: ${Math.round(correlation.mixRate * 100)}% of accounts mix public/confidential transfers - amounts can be inferred!`,
      );
    }

    // Medium: Timing patterns
    if (timing.clustering > 0.7) {
      vulnerabilities.push(
        `⚠️ MEDIUM: Transfers cluster at predictable times (clustering: ${Math.round(timing.clustering * 100)}%)`,
      );
    }

    // Medium: Immediate conversions
    if (correlation.immediateConversionRate > 0.5) {
      vulnerabilities.push(
        `⚠️ MEDIUM: ${Math.round(correlation.immediateConversionRate * 100)}% of accounts convert back to public within 1 hour`,
      );
    }

    // Low entropy
    if (timing.entropy < 0.5) {
      vulnerabilities.push(
        `📊 LOW: Timing entropy is low (${timing.entropy.toFixed(2)}) - predictable timing patterns`,
      );
    }

    return vulnerabilities;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(vulnerabilities: string[]): string[] {
    const recommendations: string[] = [];

    if (vulnerabilities.some((v) => v.includes("addresses reused"))) {
      recommendations.push(
        "💡 Users MUST use fresh addresses for each confidential transfer",
      );
      recommendations.push(
        "💡 Wallets should auto-generate new accounts for CT privacy",
      );
    }

    if (vulnerabilities.some((v) => v.includes("auditor"))) {
      recommendations.push(
        "💡 Mint creators should avoid setting auditor keys (or use threshold encryption)",
      );
      recommendations.push(
        "💡 Users should prefer mints without auditors when privacy matters",
      );
    }

    if (vulnerabilities.some((v) => v.includes("public/confidential"))) {
      recommendations.push(
        "💡 Avoid mixing public and confidential transfers in same account",
      );
      recommendations.push(
        "💡 Keep funds confidential for longer periods (days, not hours)",
      );
    }

    if (vulnerabilities.some((v) => v.includes("timing"))) {
      recommendations.push(
        "💡 Randomize transfer timing to avoid predictable patterns",
      );
      recommendations.push(
        "💡 Avoid exact hourly/daily schedules for transfers",
      );
    }

    // Always include fundamental limitation
    recommendations.push(
      "⚠️ FUNDAMENTAL LIMITATION: Confidential Transfers do NOT hide sender/receiver addresses!",
    );
    recommendations.push(
      "⚠️ Consider using mixing protocols (like Privacy Cash) for address-level privacy",
    );

    return recommendations;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(result: ConfidentialAnalysisResult): string {
    return `
Confidential Transfers Privacy Analysis
========================================

PRIVACY SCORE: ${result.privacyScore}/100

Address Privacy:
- Address reuse rate: ${Math.round(result.addressReuseRate * 100)}%
- Avg transactions per address: ${result.avgTxsPerAddress.toFixed(1)}
- Public/private mixing: ${Math.round(result.publicPrivateMixRate * 100)}%

Timing Privacy:
- Timing entropy: ${result.timingEntropy.toFixed(2)} (0-1, higher is better)
- Clustering: ${Math.round(result.timingClustering * 100)}%

Auditor Analysis:
- Mints with auditors: ${result.mintsWithAuditors}
- Unique auditors: ${result.uniqueAuditors}
- Centralization: ${Math.round(result.auditorCentralization * 100)}%

Public/Confidential Correlation:
- Avg time confidential: ${(result.avgTimeConfidential / (3600 * 1000)).toFixed(1)} hours
- Immediate conversion rate: ${Math.round(result.immediateConversionRate * 100)}%

VULNERABILITIES:
${result.vulnerabilities.map((v) => `  ${v}`).join("\n")}

RECOMMENDATIONS:
${result.recommendations.map((r) => `  ${r}`).join("\n")}
`;
  }
}
