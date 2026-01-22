/**
 * Test script to verify what database the API is actually using
 */

import dotenv from "dotenv";
import { UnveilDatabase } from "./src/indexer/db";

// Load environment variables
dotenv.config();

console.log("🔍 API Database Configuration Test");
console.log("=================================\n");

console.log("Environment Variables:");
console.log(`DATABASE_PATH: ${process.env.DATABASE_PATH}`);
console.log(`PRIVACY_CASH_PROGRAM_ID: ${process.env.PRIVACY_CASH_PROGRAM_ID}`);
console.log(`PORT: ${process.env.PORT}\n`);

// Test each database file
const testDb = (dbPath: string, label: string) => {
  console.log(`📊 Testing ${label}: ${dbPath}`);

  try {
    const db = new UnveilDatabase(dbPath);
    const stats = db.getStats();

    console.log(`   Deposits: ${stats.totalDeposits}`);
    console.log(`   Withdrawals: ${stats.totalWithdrawals}`);
    console.log(`   TVL: ${(stats.tvl / 1e9).toFixed(6)} SOL`);

    // Check for fake data
    const checkStmt = db["db"].prepare(
      "SELECT signature FROM deposits LIMIT 3",
    );
    const samples = checkStmt.all() as any[];

    let fakeCount = 0;
    samples.forEach((row) => {
      if (row.signature.startsWith("demo_") || row.signature.length !== 88) {
        fakeCount++;
      }
    });

    if (fakeCount > 0) {
      console.log(
        `   🚨 CONTAINS FAKE DATA: ${fakeCount} fake signatures found`,
      );
    } else {
      console.log(`   ✅ REAL DATA: No fake signatures detected`);
    }

    db.close();
    console.log("");
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    console.log("");
  }
};

// Test all relevant databases
testDb("./data/unveil.db", "Original Database");
testDb("./data/unveil_large_1768489687265.db", "Large Verified Database");
testDb("./data/unveil_verified_1768489511035.db", "Small Verified Database");
testDb("./data/unveil_real_1768488840834.db", "Real Database");

// Check what the API would use
console.log("📡 API Configuration Check:");
console.log(
  `API would use: ${process.env.DATABASE_PATH || "./data/unveil.db"}`,
);
console.log(
  `Frontend likely connecting to: http://localhost:${process.env.PORT || 3000}`,
);
