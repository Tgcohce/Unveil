/**
 * Analysis module entry point
 * Runs comprehensive privacy analysis
 */

import dotenv from 'dotenv';
import { UnveilDatabase } from '../indexer/db';
import { PrivacyScorer } from './scoring';
import { AnonymitySetCalculator } from './anonymity-set';
import { TimingAnalyzer } from './timing';
import { AmountAnalyzer } from './amounts';

dotenv.config();

async function runAnalysis() {
  const dbPath = process.env.DATABASE_PATH || './data/unveil.db';
  const db = new UnveilDatabase(dbPath);
  const scorer = new PrivacyScorer();

  console.log('🔬 Running Privacy Analysis...\n');

  try {
    // Calculate protocol metrics
    const metrics = await scorer.calculateProtocolMetrics(
      db,
      'Privacy Cash',
      process.env.PRIVACY_CASH_PROGRAM_ID || '9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD'
    );

    // Calculate detailed score breakdown
    const breakdown = scorer.calculatePrivacyScore(
      metrics.avgAnonymitySet,
      metrics.timingEntropy,
      metrics.uniqueAmountRatio
    );

    // Display results
    console.log('═══════════════════════════════════════════════════════');
    console.log('                   PRIVACY SCORE                       ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n🎯 Overall Score: ${breakdown.totalScore}/100 (Grade: ${scorer.getScoreGrade(breakdown.totalScore)})`);
    console.log('\n📊 Component Scores:');
    console.log(`   Anonymity:  ${breakdown.anonymityScore}/100 (weight: ${breakdown.weights.anonymity * 100}%)`);
    console.log(`   Timing:     ${breakdown.timingScore}/100 (weight: ${breakdown.weights.timing * 100}%)`);
    console.log(`   Amount:     ${breakdown.amountScore}/100 (weight: ${breakdown.weights.amount * 100}%)`);

    console.log('\n📈 Key Metrics:');
    console.log(`   Total Value Locked:     ${(metrics.tvl / 1e9).toFixed(2)} SOL`);
    console.log(`   Total Deposits:         ${metrics.totalDeposits}`);
    console.log(`   Total Withdrawals:      ${metrics.totalWithdrawals}`);
    console.log(`   Unique Depositors:      ${metrics.uniqueDepositors}`);
    console.log(`   Avg Anonymity Set:      ${metrics.avgAnonymitySet.toFixed(1)}`);
    console.log(`   Median Anonymity Set:   ${metrics.medianAnonymitySet}`);
    console.log(`   Timing Entropy:         ${metrics.timingEntropy.toFixed(2)} bits`);
    console.log(`   Unique Amount Ratio:    ${(metrics.uniqueAmountRatio * 100).toFixed(1)}%`);

    console.log('\n💡 Analysis:');
    console.log(`   Anonymity: ${breakdown.details.anonymity}`);
    console.log(`   Timing:    ${breakdown.details.timing}`);
    console.log(`   Amount:    ${breakdown.details.amount}`);

    console.log('\n🎯 Recommendations:');
    const recommendations = scorer.getRecommendations(breakdown);
    recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });

    console.log('\n═══════════════════════════════════════════════════════\n');

    // Additional detailed analysis
    console.log('📊 Detailed Analysis:\n');

    const deposits = db.getDeposits(100000);
    const withdrawals = db.getWithdrawals(100000);

    // Amount analysis
    const amountAnalyzer = new AmountAnalyzer();
    const amountDistribution = amountAnalyzer.calculateAmountDistribution(deposits);

    console.log('💰 Top 10 Most Common Amounts:');
    amountDistribution.topAmounts.forEach((a, i) => {
      console.log(`   ${i + 1}. ${(a.amount / 1e9).toFixed(3)} SOL (${a.count} deposits)`);
    });

    // Timing analysis
    const timingAnalyzer = new TimingAnalyzer();
    const pairs = timingAnalyzer.matchDepositWithdrawalPairs(deposits, withdrawals);
    const timingDistribution = timingAnalyzer.calculateTimingDistribution(pairs);

    console.log(`\n⏱️  Timing Statistics:`);
    console.log(`   Mean time delta:   ${timingAnalyzer.formatTimeDelta(timingDistribution.mean)}`);
    console.log(`   Median time delta: ${timingAnalyzer.formatTimeDelta(timingDistribution.median)}`);
    console.log(`   25th percentile:   ${timingAnalyzer.formatTimeDelta(timingDistribution.p25)}`);
    console.log(`   75th percentile:   ${timingAnalyzer.formatTimeDelta(timingDistribution.p75)}`);

    // Timing recommendations
    const timingRec = timingAnalyzer.recommendTiming(pairs);
    console.log(`\n💡 Timing Recommendation:`);
    console.log(`   ${timingRec.reasoning}`);

    // Detect patterns
    const patterns = timingAnalyzer.detectTimingPatterns(pairs);
    if (patterns.hasPattern) {
      console.log(`\n⚠️  Warning: Timing patterns detected (confidence: ${(patterns.confidence * 100).toFixed(0)}%)`);
    }

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  runAnalysis().catch(console.error);
}

export { runAnalysis };
