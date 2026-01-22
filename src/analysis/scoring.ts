/**
 * Privacy scoring algorithm
 * Calculates aggregate privacy score (0-100) for protocols
 */

import { ProtocolMetrics } from '../indexer/types';
import { AnonymitySetCalculator } from './anonymity-set';
import { TimingAnalyzer } from './timing';
import { AmountAnalyzer } from './amounts';
import { UnveilDatabase } from '../indexer/db';

export interface PrivacyScoreBreakdown {
  totalScore: number;
  anonymityScore: number;
  timingScore: number;
  amountScore: number;
  weights: {
    anonymity: number;
    timing: number;
    amount: number;
  };
  details: {
    anonymity: string;
    timing: string;
    amount: string;
  };
}

export class PrivacyScorer {
  private anonymityCalculator: AnonymitySetCalculator;
  private timingAnalyzer: TimingAnalyzer;
  private amountAnalyzer: AmountAnalyzer;

  // Scoring weights (must sum to 1.0)
  private readonly WEIGHT_ANONYMITY = 0.4;
  private readonly WEIGHT_TIMING = 0.3;
  private readonly WEIGHT_AMOUNT = 0.3;

  // Scoring thresholds
  private readonly ANONYMITY_TARGET = 100;  // 100+ = full points
  private readonly ENTROPY_TARGET = 5;      // 5+ bits = full points

  constructor() {
    this.anonymityCalculator = new AnonymitySetCalculator();
    this.timingAnalyzer = new TimingAnalyzer();
    this.amountAnalyzer = new AmountAnalyzer();
  }

  /**
   * Calculate comprehensive privacy metrics for a protocol
   */
  async calculateProtocolMetrics(
    db: UnveilDatabase,
    protocolName: string,
    programId: string
  ): Promise<ProtocolMetrics> {
    // Get all deposits and withdrawals
    const deposits = db.getUnspentDeposits();
    const allDeposits = db.getDeposits(100000); // Get all deposits
    const withdrawals = db.getWithdrawals(100000);
    const stats = db.getStats();

    // Calculate anonymity sets
    const anonymityResults = this.anonymityCalculator.calculateAllAnonymitySets(
      withdrawals,
      allDeposits
    );
    const anonymityStats = this.anonymityCalculator.calculateStatistics(anonymityResults);

    // Calculate timing distribution
    const pairs = this.timingAnalyzer.matchDepositWithdrawalPairs(allDeposits, withdrawals);
    const timingDistribution = this.timingAnalyzer.calculateTimingDistribution(pairs);

    // Calculate amount distribution
    const amountDistribution = this.amountAnalyzer.calculateAmountDistribution(allDeposits);

    // Calculate privacy score
    const scoreBreakdown = this.calculatePrivacyScore(
      anonymityStats.mean,
      timingDistribution.entropy,
      amountDistribution.uniqueRatio
    );

    return {
      protocol: protocolName,
      programId,
      tvl: stats.tvl,
      totalDeposits: stats.totalDeposits,
      totalWithdrawals: stats.totalWithdrawals,
      uniqueDepositors: stats.uniqueDepositors,
      avgAnonymitySet: anonymityStats.mean,
      medianAnonymitySet: anonymityStats.median,
      minAnonymitySet: anonymityStats.min,
      timingEntropy: timingDistribution.entropy,
      medianTimeDelta: timingDistribution.median,
      uniqueAmountRatio: amountDistribution.uniqueRatio,
      commonAmounts: amountDistribution.topAmounts.slice(0, 5).map(a => a.amount),
      privacyScore: scoreBreakdown.totalScore,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Calculate privacy score with detailed breakdown
   */
  calculatePrivacyScore(
    avgAnonymitySet: number,
    timingEntropy: number,
    uniqueAmountRatio: number
  ): PrivacyScoreBreakdown {
    // Anonymity component (40 points)
    const anonymityNormalized = Math.min(avgAnonymitySet / this.ANONYMITY_TARGET, 1);
    const anonymityScore = anonymityNormalized * 100;
    const anonymityWeighted = anonymityScore * this.WEIGHT_ANONYMITY;

    // Timing component (30 points)
    const timingNormalized = Math.min(timingEntropy / this.ENTROPY_TARGET, 1);
    const timingScore = timingNormalized * 100;
    const timingWeighted = timingScore * this.WEIGHT_TIMING;

    // Amount component (30 points)
    // Lower uniqueness ratio = better score
    const amountScore = (1 - uniqueAmountRatio) * 100;
    const amountWeighted = amountScore * this.WEIGHT_AMOUNT;

    // Total score
    const totalScore = Math.round(anonymityWeighted + timingWeighted + amountWeighted);

    // Generate details
    const details = {
      anonymity: this.getAnonymityDetails(avgAnonymitySet),
      timing: this.getTimingDetails(timingEntropy),
      amount: this.getAmountDetails(uniqueAmountRatio),
    };

    return {
      totalScore,
      anonymityScore: Math.round(anonymityScore),
      timingScore: Math.round(timingScore),
      amountScore: Math.round(amountScore),
      weights: {
        anonymity: this.WEIGHT_ANONYMITY,
        timing: this.WEIGHT_TIMING,
        amount: this.WEIGHT_AMOUNT,
      },
      details,
    };
  }

  /**
   * Get human-readable anonymity details
   */
  private getAnonymityDetails(avgAnonymitySet: number): string {
    if (avgAnonymitySet < 10) {
      return 'Weak - Very small anonymity sets make tracking easier';
    } else if (avgAnonymitySet < 30) {
      return 'Fair - Moderate anonymity sets provide some privacy';
    } else if (avgAnonymitySet < 100) {
      return 'Good - Large anonymity sets make tracking difficult';
    } else {
      return 'Excellent - Very large anonymity sets provide strong privacy';
    }
  }

  /**
   * Get human-readable timing details
   */
  private getTimingDetails(entropy: number): string {
    if (entropy < 2) {
      return 'Weak - Predictable timing patterns leak information';
    } else if (entropy < 3.5) {
      return 'Fair - Some timing variation but patterns exist';
    } else if (entropy < 5) {
      return 'Good - Random timing makes correlation harder';
    } else {
      return 'Excellent - Highly random timing provides strong protection';
    }
  }

  /**
   * Get human-readable amount details
   */
  private getAmountDetails(uniqueRatio: number): string {
    if (uniqueRatio > 0.7) {
      return 'Weak - Too many unique amounts create linkability';
    } else if (uniqueRatio > 0.4) {
      return 'Fair - Moderate use of common amounts';
    } else if (uniqueRatio > 0.2) {
      return 'Good - Most deposits use common amounts';
    } else {
      return 'Excellent - Strong standardization on common amounts';
    }
  }

  /**
   * Get score grade (A, B, C, D, F)
   */
  getScoreGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get score color for UI
   */
  getScoreColor(score: number): string {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  }

  /**
   * Get recommendations based on score breakdown
   */
  getRecommendations(breakdown: PrivacyScoreBreakdown): string[] {
    const recommendations: string[] = [];

    if (breakdown.anonymityScore < 70) {
      recommendations.push(
        'Increase anonymity set by encouraging more deposits or waiting longer before withdrawing'
      );
    }

    if (breakdown.timingScore < 70) {
      recommendations.push(
        'Vary withdrawal timing more to reduce predictable patterns'
      );
    }

    if (breakdown.amountScore < 70) {
      recommendations.push(
        'Use standardized amounts (0.1, 1, 10 SOL) to improve mixing'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Good privacy practices! Keep up the strong operational security.');
    }

    return recommendations;
  }

  /**
   * Compare two protocols
   */
  compareProtocols(
    protocol1: ProtocolMetrics,
    protocol2: ProtocolMetrics
  ): {
    winner: string;
    comparison: {
      privacyScore: number;
      anonymitySet: number;
      timingEntropy: number;
      amountPrivacy: number;
    };
    summary: string;
  } {
    const scoreDiff = protocol1.privacyScore - protocol2.privacyScore;
    const anonymityDiff = protocol1.avgAnonymitySet - protocol2.avgAnonymitySet;
    const timingDiff = protocol1.timingEntropy - protocol2.timingEntropy;
    const amountDiff = protocol2.uniqueAmountRatio - protocol1.uniqueAmountRatio; // Lower is better

    const winner = scoreDiff > 0 ? protocol1.protocol : protocol2.protocol;

    let summary = `${winner} provides better overall privacy. `;

    if (Math.abs(scoreDiff) < 5) {
      summary = 'Both protocols provide similar privacy levels. ';
    }

    if (Math.abs(anonymityDiff) > 20) {
      const better = anonymityDiff > 0 ? protocol1.protocol : protocol2.protocol;
      summary += `${better} has significantly larger anonymity sets. `;
    }

    return {
      winner,
      comparison: {
        privacyScore: scoreDiff,
        anonymitySet: anonymityDiff,
        timingEntropy: timingDiff,
        amountPrivacy: amountDiff,
      },
      summary,
    };
  }
}
