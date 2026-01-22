/**
 * SilentSwap Privacy Analysis
 *
 * Attack Strategy for Cross-Chain Privacy Routing:
 *
 * 1. TIMING CORRELATION
 *    - SilentSwap completes in 30 sec - 3 min
 *    - Match inputs with outputs in this time window
 *    - High confidence for pairs within 1-2 minute window
 *
 * 2. AMOUNT MATCHING
 *    - SilentSwap charges 1% fee
 *    - output_amount ≈ input_amount * 0.99
 *    - Very precise fingerprint since fee is consistent
 *
 * 3. MULTI-OUTPUT FINGERPRINTING
 *    - If user splits output to multiple wallets (e.g., 40/30/30)
 *    - The split pattern creates a unique fingerprint
 *    - Can link even when amounts are slightly different
 *
 * 4. FACILITATOR WALLET TRACKING
 *    - HD wallets are derived but pattern may be predictable
 *    - One-time wallets can still be clustered by timing
 *
 * $5K Bounty Target
 */

import {
  SilentSwapInput,
  SilentSwapOutput,
  SilentSwapMatch,
  SilentSwapAnalysisResult,
  SILENTSWAP_RELAY_ADDRESS,
} from "../indexer/types";

// SilentSwap expected parameters
const SILENTSWAP_PARAMS = {
  expectedFeeRate: 0.01, // 1% fee
  feeRateTolerance: 0.005, // Allow 0.5% variance
  minTimeDelta: 30 * 1000, // 30 seconds minimum
  maxTimeDelta: 5 * 60 * 1000, // 5 minutes maximum (with buffer)
  typicalTimeDelta: 90 * 1000, // 90 seconds typical
};

export class SilentSwapAttack {
  /**
   * Run comprehensive timing correlation attack on SilentSwap
   *
   * Returns analysis results including matched pairs and privacy score.
   */
  analyze(
    inputs: SilentSwapInput[],
    outputs: SilentSwapOutput[],
  ): SilentSwapAnalysisResult {
    console.log(
      `\nAnalyzing ${inputs.length} inputs and ${outputs.length} outputs...`,
    );

    // 1. Run timing + amount correlation attack
    const matches = this.correlationAttack(inputs, outputs);

    // 2. Analyze timing patterns
    const timingMetrics = this.analyzeTimingPatterns(matches);

    // 3. Analyze amount patterns
    const amountMetrics = this.analyzeAmountPatterns(matches);

    // 4. Detect multi-output fingerprints
    const fingerprintMetrics = this.detectMultiOutputFingerprints(
      inputs,
      outputs,
    );

    // 5. Calculate privacy score
    const privacyScore = this.calculatePrivacyScore(
      matches.length,
      inputs.length,
      outputs.length,
      timingMetrics,
      amountMetrics,
      fingerprintMetrics,
    );

    // 6. Identify vulnerabilities
    const { vulnerabilities, recommendations } = this.identifyVulnerabilities(
      matches,
      timingMetrics,
      amountMetrics,
      fingerprintMetrics,
    );

    const linkabilityRate =
      inputs.length > 0 ? (matches.length / inputs.length) * 100 : 0;

    return {
      protocol: "SilentSwap",
      relayAddress: SILENTSWAP_RELAY_ADDRESS,
      privacyScore,

      totalInputs: inputs.length,
      totalOutputs: outputs.length,
      matchedPairs: matches.length,

      linkabilityRate,
      avgConfidence:
        matches.length > 0
          ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
          : 0,
      avgTimeDelta:
        matches.length > 0
          ? matches.reduce((sum, m) => sum + m.timeDeltaSeconds, 0) /
            matches.length
          : 0,

      avgFeeRate: amountMetrics.avgFeeRate,
      amountCorrelationStrength: amountMetrics.correlationStrength,

      timingEntropy: timingMetrics.entropy,
      minTimeDelta: timingMetrics.minDelta,
      maxTimeDelta: timingMetrics.maxDelta,
      timingWindowExploitable: timingMetrics.exploitable,

      multiOutputSwaps: fingerprintMetrics.multiOutputCount,
      uniqueSplitPatterns: fingerprintMetrics.uniquePatterns,
      fingerprintableRate: fingerprintMetrics.fingerprintableRate,

      vulnerabilities,
      recommendations,

      matches,
    };
  }

  /**
   * Timing + Amount Correlation Attack
   *
   * For each input, find potential matching outputs based on:
   * 1. Time window: output.timestamp between input.timestamp + 30s and + 5min
   * 2. Amount match: output.amount ≈ input.amount * 0.99 (1% fee)
   */
  private correlationAttack(
    inputs: SilentSwapInput[],
    outputs: SilentSwapOutput[],
  ): SilentSwapMatch[] {
    const matches: SilentSwapMatch[] = [];
    const usedOutputs = new Set<string>(); // Prevent double-matching

    // Sort by timestamp for efficient matching
    const sortedInputs = [...inputs].sort((a, b) => a.timestamp - b.timestamp);
    const sortedOutputs = [...outputs].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    for (const input of sortedInputs) {
      // Find candidate outputs in the time window
      const candidates = sortedOutputs.filter((output) => {
        if (usedOutputs.has(output.signature)) return false;

        const timeDelta = output.timestamp - input.timestamp;
        return (
          timeDelta >= SILENTSWAP_PARAMS.minTimeDelta &&
          timeDelta <= SILENTSWAP_PARAMS.maxTimeDelta
        );
      });

      // Score each candidate by amount match
      const scoredCandidates = candidates.map((output) => {
        const timeDelta = output.timestamp - input.timestamp;
        const amountRatio = output.amount / input.amount;
        const expectedRatio = 1 - SILENTSWAP_PARAMS.expectedFeeRate; // 0.99

        // How close is the ratio to expected?
        const ratioDeviation = Math.abs(amountRatio - expectedRatio);
        const amountScore = Math.max(0, 1 - ratioDeviation / 0.05); // Penalize deviation

        // Timing score (closer to typical = higher score)
        const timingDeviation = Math.abs(
          timeDelta - SILENTSWAP_PARAMS.typicalTimeDelta,
        );
        const timingScore = Math.max(
          0,
          1 - timingDeviation / SILENTSWAP_PARAMS.maxTimeDelta,
        );

        // Combined score
        const totalScore = amountScore * 0.6 + timingScore * 0.4;

        return {
          output,
          timeDelta,
          amountRatio,
          score: totalScore,
        };
      });

      // Sort by score and take the best match
      scoredCandidates.sort((a, b) => b.score - a.score);

      if (scoredCandidates.length > 0 && scoredCandidates[0].score > 0.3) {
        const best = scoredCandidates[0];
        const matchReasons: string[] = [];

        // Build match reasons
        const timeDeltaSecs = Math.round(best.timeDelta / 1000);
        matchReasons.push(`Timing: ${timeDeltaSecs}s after input`);

        const feePercent = ((1 - best.amountRatio) * 100).toFixed(2);
        matchReasons.push(`Fee: ${feePercent}% (expected ~1%)`);

        if (best.amountRatio >= 0.985 && best.amountRatio <= 0.995) {
          matchReasons.push(`Amount match: Very precise (within 0.5%)`);
        }

        // Confidence as percentage
        const confidence = Math.round(best.score * 100);

        matches.push({
          inputId: input.id || 0,
          outputId: best.output.id || 0,
          input,
          output: best.output,
          confidence,
          timeDeltaSeconds: timeDeltaSecs,
          amountRatio: best.amountRatio,
          matchReasons,
        });

        usedOutputs.add(best.output.signature);
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  /**
   * Analyze timing patterns in matched pairs
   */
  private analyzeTimingPatterns(matches: SilentSwapMatch[]) {
    if (matches.length === 0) {
      return {
        entropy: 0,
        minDelta: 0,
        maxDelta: 0,
        avgDelta: 0,
        exploitable: false,
      };
    }

    const deltas = matches.map((m) => m.timeDeltaSeconds);
    deltas.sort((a, b) => a - b);

    const minDelta = deltas[0];
    const maxDelta = deltas[deltas.length - 1];
    const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;

    // Calculate entropy (how random are the timing values?)
    const bucketSize = 30; // 30 second buckets
    const buckets = new Map<number, number>();

    for (const delta of deltas) {
      const bucket = Math.floor(delta / bucketSize);
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    let entropy = 0;
    const total = deltas.length;
    for (const count of buckets.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    // Normalize entropy (0-1)
    const maxEntropy = Math.log2(buckets.size);
    entropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Is the timing window exploitable?
    // If most transactions cluster in a narrow window, it's predictable
    const exploitable = maxDelta - minDelta < 120 || entropy < 0.5;

    return {
      entropy,
      minDelta,
      maxDelta,
      avgDelta,
      exploitable,
    };
  }

  /**
   * Analyze amount patterns (fee consistency)
   */
  private analyzeAmountPatterns(matches: SilentSwapMatch[]) {
    if (matches.length === 0) {
      return {
        avgFeeRate: 0,
        feeRateVariance: 0,
        correlationStrength: 0,
      };
    }

    const feeRates = matches.map((m) => 1 - m.amountRatio);

    const avgFeeRate =
      feeRates.reduce((sum, r) => sum + r, 0) / feeRates.length;

    // Variance in fee rates
    const variance =
      feeRates.reduce((sum, r) => sum + Math.pow(r - avgFeeRate, 2), 0) /
      feeRates.length;

    // Correlation strength: how consistent are the fees?
    // Lower variance = higher correlation strength
    const correlationStrength = Math.max(0, 1 - Math.sqrt(variance) * 10);

    return {
      avgFeeRate,
      feeRateVariance: variance,
      correlationStrength,
    };
  }

  /**
   * Detect multi-output fingerprinting opportunities
   *
   * If a user splits their output to multiple wallets in a specific pattern,
   * that pattern becomes a unique fingerprint.
   */
  private detectMultiOutputFingerprints(
    inputs: SilentSwapInput[],
    outputs: SilentSwapOutput[],
  ) {
    // Group outputs by timestamp proximity (within 60 seconds = likely same swap)
    const outputGroups: SilentSwapOutput[][] = [];
    const sortedOutputs = [...outputs].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    let currentGroup: SilentSwapOutput[] = [];
    for (const output of sortedOutputs) {
      if (
        currentGroup.length === 0 ||
        output.timestamp - currentGroup[currentGroup.length - 1].timestamp <
          60000
      ) {
        currentGroup.push(output);
      } else {
        if (currentGroup.length > 0) {
          outputGroups.push(currentGroup);
        }
        currentGroup = [output];
      }
    }
    if (currentGroup.length > 0) {
      outputGroups.push(currentGroup);
    }

    // Find groups with multiple outputs (potential split patterns)
    const multiOutputGroups = outputGroups.filter((g) => g.length > 1);

    // Generate fingerprint for each group (sorted normalized percentages)
    const fingerprints = new Set<string>();

    for (const group of multiOutputGroups) {
      const total = group.reduce((sum, o) => sum + o.amount, 0);
      const percentages = group
        .map((o) => Math.round((o.amount / total) * 100))
        .sort((a, b) => b - a);
      const fingerprint = percentages.join("-");
      fingerprints.add(fingerprint);
    }

    const fingerprintableRate =
      multiOutputGroups.length > 0
        ? (fingerprints.size / multiOutputGroups.length) * 100
        : 0;

    return {
      multiOutputCount: multiOutputGroups.length,
      uniquePatterns: fingerprints.size,
      fingerprintableRate,
    };
  }

  /**
   * Calculate composite privacy score (0-100)
   */
  private calculatePrivacyScore(
    matchedCount: number,
    inputCount: number,
    outputCount: number,
    timingMetrics: {
      entropy: number;
      exploitable: boolean;
    },
    amountMetrics: {
      correlationStrength: number;
    },
    fingerprintMetrics: {
      fingerprintableRate: number;
    },
  ): number {
    let score = 100;

    // Linkability penalty (0-40 points)
    const linkabilityRate = inputCount > 0 ? matchedCount / inputCount : 0;
    score -= linkabilityRate * 40;

    // Timing entropy penalty (0-20 points)
    score -= (1 - timingMetrics.entropy) * 20;

    // Timing exploitability penalty (0-10 points)
    if (timingMetrics.exploitable) {
      score -= 10;
    }

    // Amount correlation penalty (0-20 points)
    score -= amountMetrics.correlationStrength * 20;

    // Multi-output fingerprinting penalty (0-10 points)
    score -= (fingerprintMetrics.fingerprintableRate / 100) * 10;

    return Math.max(0, Math.round(score));
  }

  /**
   * Identify vulnerabilities and recommendations
   */
  private identifyVulnerabilities(
    matches: SilentSwapMatch[],
    timingMetrics: {
      entropy: number;
      exploitable: boolean;
      minDelta: number;
      maxDelta: number;
    },
    amountMetrics: {
      avgFeeRate: number;
      correlationStrength: number;
    },
    fingerprintMetrics: {
      multiOutputCount: number;
      fingerprintableRate: number;
    },
  ) {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // Timing vulnerabilities
    if (timingMetrics.exploitable) {
      vulnerabilities.push(
        `CRITICAL: Timing window is too narrow (${timingMetrics.minDelta}s - ${timingMetrics.maxDelta}s). Transactions are easily correlatable.`,
      );
      recommendations.push(
        `Add random delays (5-30 minutes) before completing swaps to increase timing entropy.`,
      );
    }

    if (timingMetrics.entropy < 0.5) {
      vulnerabilities.push(
        `HIGH: Low timing entropy (${(timingMetrics.entropy * 100).toFixed(0)}%). Swap completion times are predictable.`,
      );
      recommendations.push(
        `Randomize processing times to make correlation harder.`,
      );
    }

    // Amount vulnerabilities
    if (amountMetrics.correlationStrength > 0.8) {
      vulnerabilities.push(
        `CRITICAL: Fixed ${(amountMetrics.avgFeeRate * 100).toFixed(1)}% fee makes amount matching trivial.`,
      );
      recommendations.push(
        `Randomize fee rates between 0.5% - 2% to break amount correlation.`,
      );
    }

    if (amountMetrics.avgFeeRate > 0.005 && amountMetrics.avgFeeRate < 0.02) {
      vulnerabilities.push(
        `HIGH: Fee rate is consistent at ~${(amountMetrics.avgFeeRate * 100).toFixed(1)}%. Output amounts are predictable from inputs.`,
      );
    }

    // Multi-output fingerprinting
    if (fingerprintMetrics.fingerprintableRate > 50) {
      vulnerabilities.push(
        `MEDIUM: ${fingerprintMetrics.fingerprintableRate.toFixed(0)}% of multi-output swaps have unique split patterns.`,
      );
      recommendations.push(
        `Avoid splitting outputs to multiple wallets, or use standard split ratios (50/50, 33/33/34).`,
      );
    }

    // Cross-chain observation
    vulnerabilities.push(
      `MEDIUM: Cross-chain timing is observable. Solana input → Solana output timing can be tracked even through Secret Network.`,
    );
    recommendations.push(
      `Hold funds in Secret Network for variable periods (hours to days) before output.`,
    );

    // High match rate
    if (matches.length > 0) {
      const highConfidenceMatches = matches.filter(
        (m) => m.confidence > 70,
      ).length;
      if (highConfidenceMatches > matches.length * 0.5) {
        vulnerabilities.push(
          `CRITICAL: ${highConfidenceMatches} of ${matches.length} matches have >70% confidence. Privacy is severely compromised.`,
        );
      }
    }

    return { vulnerabilities, recommendations };
  }

  /**
   * Generate human-readable summary
   */
  generateSummary(result: SilentSwapAnalysisResult): string {
    const lines: string[] = [];

    lines.push("\n" + "=".repeat(60));
    lines.push("SilentSwap Privacy Analysis");
    lines.push("=".repeat(60));
    lines.push("");
    lines.push(`PRIVACY SCORE: ${result.privacyScore}/100`);
    lines.push("");

    lines.push("Transaction Analysis:");
    lines.push(`- Total Inputs: ${result.totalInputs}`);
    lines.push(`- Total Outputs: ${result.totalOutputs}`);
    lines.push(`- Matched Pairs: ${result.matchedPairs}`);
    lines.push(`- Linkability Rate: ${result.linkabilityRate.toFixed(1)}%`);
    lines.push(`- Average Confidence: ${result.avgConfidence.toFixed(1)}%`);
    lines.push("");

    lines.push("Timing Analysis:");
    lines.push(`- Average Time Delta: ${result.avgTimeDelta.toFixed(0)}s`);
    lines.push(`- Min Time Delta: ${result.minTimeDelta}s`);
    lines.push(`- Max Time Delta: ${result.maxTimeDelta}s`);
    lines.push(`- Timing Entropy: ${(result.timingEntropy * 100).toFixed(1)}%`);
    lines.push(
      `- Timing Exploitable: ${result.timingWindowExploitable ? "YES" : "NO"}`,
    );
    lines.push("");

    lines.push("Amount Analysis:");
    lines.push(`- Average Fee Rate: ${(result.avgFeeRate * 100).toFixed(2)}%`);
    lines.push(
      `- Amount Correlation: ${(result.amountCorrelationStrength * 100).toFixed(1)}%`,
    );
    lines.push("");

    lines.push("Multi-Output Fingerprinting:");
    lines.push(`- Multi-Output Swaps: ${result.multiOutputSwaps}`);
    lines.push(`- Unique Split Patterns: ${result.uniqueSplitPatterns}`);
    lines.push(
      `- Fingerprintable Rate: ${result.fingerprintableRate.toFixed(1)}%`,
    );
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
      "  SilentSwap's cross-chain routing provides some privacy, but the fixed",
    );
    lines.push(
      "  1% fee and narrow timing window (30s-3min) create strong correlation",
    );
    lines.push(
      "  signals. For Solana-to-Solana swaps, timing + amount matching can",
    );
    lines.push(`  link ${result.linkabilityRate.toFixed(1)}% of transactions.`);
    lines.push("");

    return lines.join("\n");
  }
}

// CLI entry point
if (require.main === module) {
  // Demo with synthetic data
  const attack = new SilentSwapAttack();

  // Create sample data
  const now = Date.now();
  const sampleInputs: SilentSwapInput[] = [
    {
      id: 1,
      signature: "input1",
      timestamp: now - 120000,
      userWallet: "user1",
      facilitatorWallet: SILENTSWAP_RELAY_ADDRESS,
      amount: 1_000_000_000, // 1 SOL
      token: "SOL",
      bridgeProvider: "relay.link",
    },
    {
      id: 2,
      signature: "input2",
      timestamp: now - 60000,
      userWallet: "user2",
      facilitatorWallet: SILENTSWAP_RELAY_ADDRESS,
      amount: 5_000_000_000, // 5 SOL
      token: "SOL",
      bridgeProvider: "relay.link",
    },
  ];

  const sampleOutputs: SilentSwapOutput[] = [
    {
      id: 1,
      signature: "output1",
      timestamp: now - 30000, // 90s after input1
      facilitatorWallet: SILENTSWAP_RELAY_ADDRESS,
      destinationWallet: "dest1",
      amount: 990_000_000, // 0.99 SOL (1% fee)
      token: "SOL",
      bridgeProvider: "relay.link",
    },
    {
      id: 2,
      signature: "output2",
      timestamp: now, // 60s after input2
      facilitatorWallet: SILENTSWAP_RELAY_ADDRESS,
      destinationWallet: "dest2",
      amount: 4_950_000_000, // 4.95 SOL (1% fee)
      token: "SOL",
      bridgeProvider: "relay.link",
    },
  ];

  const result = attack.analyze(sampleInputs, sampleOutputs);
  console.log(attack.generateSummary(result));
}
