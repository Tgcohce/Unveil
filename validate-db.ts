/**
 * Validate database content
 */

import { UnveilDatabase } from "./src/indexer/db";

const db = new UnveilDatabase("./data/unveil_large_1768489687265.db");

console.log("=== DATABASE VALIDATION ===\n");

// Get stats
const stats = db.getStats();
console.log("📊 Stats:");
console.log(`   Deposits: ${stats.totalDeposits}`);
console.log(`   Withdrawals: ${stats.totalWithdrawals}`);
console.log(`   TVL: ${(stats.tvl / 1e9).toFixed(6)} SOL`);
console.log(`   Unique Depositors: ${stats.uniqueDepositors}\n`);

// Get sample deposits
console.log("💰 Sample Deposits:");
const deposits = db.getDeposits(5);
deposits.forEach((d, i) => {
  console.log(`\n${i + 1}. Signature: ${d.signature}`);
  console.log(`   Amount: ${(d.amount / 1e9).toFixed(6)} SOL`);
  console.log(`   Depositor: ${d.depositor}`);
  console.log(`   Timestamp: ${new Date(d.timestamp).toISOString()}`);
  console.log(`   Signature length: ${d.signature.length}`);
  console.log(
    `   Base58 valid: ${/^[1-9A-HJ-NP-Za-km-z]+$/.test(d.signature)}`,
  );
  console.log(`   Solscan: https://solscan.io/tx/${d.signature}`);
});

// Check for fake data
console.log("\n\n🔍 Checking for fake data...");
const allDeposits = db.getDeposits(100);
const fakeDeposits = allDeposits.filter(
  (d) =>
    d.signature.length !== 88 || !d.signature.match(/^[1-9A-HJ-NP-Za-km-z]+$/),
);

if (fakeDeposits.length === 0) {
  console.log("✅ No fake deposits found!");
} else {
  console.log(`❌ Found ${fakeDeposits.length} fake deposits`);
  fakeDeposits.forEach((d) => console.log(`   - ${d.signature}`));
}

db.close();
