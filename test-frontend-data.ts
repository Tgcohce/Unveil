/**
 * Simple test to verify frontend is working with real data
 */

import dotenv from "dotenv";

// Set environment variables
process.env.DATABASE_PATH = "./data/unveil_large_1768489687265.db";
process.env.PRIVACY_CASH_PROGRAM_ID =
  "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";

console.log("🔍 Frontend Data Verification Test");
console.log("===================================\n");

// Test database directly
import { UnveilDatabase } from "./src/indexer/db";

const db = new UnveilDatabase(process.env.DATABASE_PATH);
const stats = db.getStats();

console.log("📊 Current Database Stats:");
console.log(`   Database: ${process.env.DATABASE_PATH}`);
console.log(`   Deposits: ${stats.totalDeposits}`);
console.log(`   Withdrawals: ${stats.totalWithdrawals}`);
console.log(`   TVL: ${(stats.tvl / 1e9).toFixed(6)} SOL`);
console.log(`   Unique Users: ${stats.uniqueDepositors}\n`);

// Check if this is our verified database
if (stats.totalDeposits === 16 && stats.totalWithdrawals === 0) {
  console.log("✅ SUCCESS: Using verified real database");
  console.log("✅ Frontend should show real Privacy Cash data");
} else {
  console.log("❌ ERROR: Not using verified database");
  console.log(`❌ Expected: 16 deposits, 0 withdrawals`);
  console.log(
    `❌ Actual: ${stats.totalDeposits} deposits, ${stats.totalWithdrawals} withdrawals`,
  );
}

// Test a few sample transactions
const sampleStmt = db["db"].prepare(
  "SELECT signature, amount, depositor FROM deposits LIMIT 3",
);
const samples = sampleStmt.all() as any[];

console.log("\n📋 Sample Transactions:");
samples.forEach((sample, i) => {
  console.log(`${i + 1}. ${sample.signature.slice(0, 16)}...`);
  console.log(`   Amount: ${(sample.amount / 1e9).toFixed(6)} SOL`);
  console.log(`   From: ${sample.depositor.slice(0, 12)}...`);
  console.log("");
});

// Check for fake data
let fakeCount = 0;
samples.forEach((sample) => {
  if (sample.signature.startsWith("demo_") || sample.signature.length !== 88) {
    fakeCount++;
  }
});

if (fakeCount === 0) {
  console.log("✅ All sample transactions are real");
} else {
  console.log(`❌ Found ${fakeCount} fake transactions in sample`);
}

db.close();

console.log("\n🌐 Frontend Configuration:");
console.log("========================");
console.log("Dashboard should be running on: http://localhost:3001");
console.log("API should be running on: http://localhost:3002");
console.log("Dashboard proxy configured to: http://localhost:3002");

console.log("\n🎯 Instructions:");
console.log("1. Open http://localhost:3001 in your browser");
console.log("2. The dashboard should show:");
console.log("   - 16 real deposits");
console.log("   - 0 withdrawals");
console.log("   - 0.36 SOL TVL");
console.log("   - 6 unique users");
console.log("   - Real Solana transaction signatures");
console.log("3. Privacy score should be: 23/100 (Grade F)");

console.log(
  "\n✅ If you see fake data, the frontend is still connecting to the old API",
);
