/**
 * Test script to verify API matches endpoint works
 */

import { UnveilDatabase } from "./src/indexer/db";
import { TimingCorrelationAttack } from "./src/analysis/timing-attack";

const db = new UnveilDatabase("./data/unveil_working.db");
const timingAttack = new TimingCorrelationAttack();

const deposits = db.getDeposits(100000);
const withdrawals = db.getWithdrawals(100000);

console.log(
  `Loaded ${deposits.length} deposits, ${withdrawals.length} withdrawals`,
);

// Perform timing attack
const { results } = timingAttack.analyzeAll(withdrawals, deposits);

// Filter to max anonymity set 10
const filtered = results.filter((r) => r.anonymitySet <= 10);

// Filter to only those with matches
const withMatches = filtered.filter((r) => r.likelySources.length > 0);

console.log(`\nResults:`);
console.log(`- Total withdrawals analyzed: ${results.length}`);
console.log(`- Vulnerable (anonymity ≤ 10): ${filtered.length}`);
console.log(`- With actual matches: ${withMatches.length}`);

if (withMatches.length > 0) {
  console.log(`\nFirst match example:`);
  const first = withMatches[0];
  console.log(
    `- Withdrawal: ${(first.withdrawal.amount / 1e9).toFixed(3)} SOL`,
  );
  console.log(`- Anonymity set: ${first.anonymitySet}`);
  console.log(`- Vulnerability: ${first.vulnerabilityLevel}`);
  console.log(`- Sources found: ${first.likelySources.length}`);

  if (first.likelySources.length > 0) {
    const source = first.likelySources[0];
    console.log(`\n  Source deposit:`);
    console.log(`  - Amount: ${(source.deposit.amount / 1e9).toFixed(3)} SOL`);
    console.log(`  - Depositor: ${source.deposit.depositor}`);
    console.log(`  - Confidence: ${(source.confidence * 100).toFixed(0)}%`);
    console.log(
      `  - Time delta: ${(source.timeDelta / 60000).toFixed(0)} minutes`,
    );
  }
}

db.close();
