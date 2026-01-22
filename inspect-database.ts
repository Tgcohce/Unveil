/**
 * Direct database inspection commands
 */

import { UnveilDatabase } from "./src/indexer/db";
import fs from "fs";

// Set to our real database
const dbPath = "./data/unveil_real_1768488840834.db";

function inspectDatabase() {
  console.log("🔍 Direct Database Inspection");
  console.log("============================\n");

  if (!fs.existsSync(dbPath)) {
    console.log("❌ Database file does not exist:", dbPath);
    return;
  }

  const db = new UnveilDatabase(dbPath);

  try {
    // Get basic stats
    console.log("📊 Basic Database Stats:");
    const stats = db.getStats();
    console.log(`Total Deposits: ${stats.totalDeposits}`);
    console.log(`Total Withdrawals: ${stats.totalWithdrawals}`);
    console.log(`TVL: ${(stats.tvl / 1e9).toFixed(6)} SOL`);
    console.log(`Unique Depositors: ${stats.uniqueDepositors}\n`);

    // Get ALL deposits with raw data
    console.log("📥 Raw Deposit Data:");
    console.log("=====================");

    const allDepositsStmt = db["db"].prepare(
      "SELECT * FROM deposits ORDER BY timestamp DESC",
    );
    const allDeposits = allDepositsStmt.all() as any[];

    if (allDeposits.length === 0) {
      console.log("❌ NO DEPOSITS FOUND IN DATABASE");
      return;
    }

    console.log(`Found ${allDeposits.length} deposits:\n`);

    allDeposits.forEach((deposit, index) => {
      console.log(`${index + 1}. DEPOSIT ${index + 1}:`);
      console.log(`   Signature: ${deposit.signature}`);
      console.log(
        `   Timestamp: ${deposit.timestamp} (${new Date(deposit.timestamp).toISOString()})`,
      );
      console.log(`   Slot: ${deposit.slot}`);
      console.log(
        `   Amount: ${deposit.amount} lamports (${(deposit.amount / 1e9).toFixed(6)} SOL)`,
      );
      console.log(`   Depositor: ${deposit.depositor}`);
      console.log(`   Commitment: ${deposit.commitment}`);
      console.log(`   Spent: ${deposit.spent}`);
      console.log(`   Spent At: ${deposit.spent_at || "NULL"}`);
      console.log(
        `   Withdrawal Signature: ${deposit.withdrawal_signature || "NULL"}`,
      );
      console.log("");
    });

    // Get ALL withdrawals
    console.log("💸 Raw Withdrawal Data:");
    console.log("=======================");

    const allWithdrawalsStmt = db["db"].prepare(
      "SELECT * FROM withdrawals ORDER BY timestamp DESC",
    );
    const allWithdrawals = allWithdrawalsStmt.all() as any[];

    if (allWithdrawals.length === 0) {
      console.log("❌ NO WITHDRAWALS FOUND IN DATABASE");
    } else {
      console.log(`Found ${allWithdrawals.length} withdrawals:\n`);

      allWithdrawals.forEach((withdrawal, index) => {
        console.log(`${index + 1}. WITHDRAWAL ${index + 1}:`);
        console.log(`   Signature: ${withdrawal.signature}`);
        console.log(
          `   Timestamp: ${withdrawal.timestamp} (${new Date(withdrawal.timestamp).toISOString()})`,
        );
        console.log(`   Slot: ${withdrawal.slot}`);
        console.log(
          `   Amount: ${withdrawal.amount} lamports (${(withdrawal.amount / 1e9).toFixed(6)} SOL)`,
        );
        console.log(`   Recipient: ${withdrawal.recipient}`);
        console.log(`   Nullifier: ${withdrawal.nullifier}`);
        console.log(`   Relayer: ${withdrawal.relayer}`);
        console.log(`   Fee: ${withdrawal.fee} lamports`);
        console.log("");
      });
    }

    // Check for suspicious patterns
    console.log("🚨 Suspicious Pattern Check:");
    console.log("============================");

    // Check for fake signatures
    const fakeSignatures = allDeposits.filter(
      (d) =>
        d.signature.startsWith("demo_") ||
        d.signature.length !== 88 ||
        !d.signature.match(/^[A-HJ-NP-Za-km-z1-9]+$/),
    );

    if (fakeSignatures.length > 0) {
      console.log(`❌ FOUND ${fakeSignatures.length} FAKE SIGNATURES:`);
      fakeSignatures.forEach((d) => {
        console.log(`   - ${d.signature}`);
      });
    } else {
      console.log("✅ All signatures have valid Solana format");
    }

    // Check for suspicious amounts
    const suspiciousAmounts = allDeposits.filter(
      (d) =>
        d.amount === 1000000000 || // Exactly 1 SOL
        d.amount === 100000000 || // Exactly 0.1 SOL
        d.amount === 10000000, // Exactly 0.01 SOL
    );

    if (suspiciousAmounts.length > 0) {
      console.log(
        `⚠️  ${suspiciousAmounts.length} deposits with round numbers (could be fake)`,
      );
    }

    // Check timestamp patterns
    const timestamps = allDeposits.map((d) => d.timestamp);
    const timeRange = Math.max(...timestamps) - Math.min(...timestamps);
    console.log(`⏰ Time range: ${timeRange / (1000 * 60 * 60)} hours`);

    if (timeRange < 60000) {
      // Less than 1 minute
      console.log("❌ All deposits within 1 minute - likely fake data");
    }

    // Check for duplicate amounts
    const amountCounts: any = {};
    allDeposits.forEach((d) => {
      amountCounts[d.amount] = (amountCounts[d.amount] || 0) + 1;
    });

    const duplicates = Object.entries(amountCounts).filter(
      ([_, count]) => Number(count) > 1,
    );
    if (duplicates.length > 0) {
      console.log(`📊 Amount frequency:`);
      duplicates.forEach(([amount, count]) => {
        console.log(
          `   ${(Number(amount) / 1e9).toFixed(6)} SOL: ${count} times`,
        );
      });
    }

    console.log("\n🎯 Database Inspection Complete");
    console.log("==============================");
  } catch (error) {
    console.error("❌ Error inspecting database:", error);
  } finally {
    db.close();
  }
}

inspectDatabase();
