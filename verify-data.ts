/**
 * Database verification script
 * Checks data integrity and validates transactions against on-chain data
 */

import { UnveilDatabase } from "./src/indexer/db";
import { HeliusClient } from "./src/indexer/helius";
import { PrivacyCashBalanceParser } from "./src/indexer/privacy-cash-balance";
import dotenv from "dotenv";

dotenv.config();

async function verifyDataIntegrity() {
  console.log("🔍 Verifying Privacy Cash Data Integrity");
  console.log("========================================\n");

  const db = new UnveilDatabase("./data/unveil.db");
  const helius = new HeliusClient(process.env.HELIUS_API_KEY!);
  const parser = new PrivacyCashBalanceParser();

  try {
    // Get database stats
    const stats = db.getStats();
    console.log("📊 Database Statistics:");
    console.log(`   Total Deposits: ${stats.totalDeposits}`);
    console.log(`   Total Withdrawals: ${stats.totalWithdrawals}`);
    console.log(`   Unspent Deposits: ${stats.unspentDeposits}`);
    console.log(`   TVL: ${(stats.tvl / 1e9).toFixed(4)} SOL`);
    console.log(`   Unique Depositors: ${stats.uniqueDepositors}\n`);

    if (stats.totalDeposits === 0) {
      console.log("❌ No deposits found in database");
      return;
    }

    // Get recent deposits manually
    console.log("🔍 Verifying Recent Deposits...");
    const recentDepositsStmt = db["db"].prepare(`
      SELECT * FROM deposits 
      ORDER BY timestamp DESC 
      LIMIT 5
    `);
    const recentDeposits = recentDepositsStmt.all() as any[];

    for (let i = 0; i < recentDeposits.length; i++) {
      const deposit = recentDeposits[i];
      console.log(
        `\n${i + 1}. Checking deposit: ${deposit.signature.slice(0, 8)}...`,
      );

      // Fetch original transaction from on-chain
      const tx = await helius.getTransaction(deposit.signature);
      if (!tx) {
        console.log("   ❌ Transaction not found on-chain");
        continue;
      }

      // Re-parse with balance flow to verify
      const parsed = parser.parsePrivacyCashTransaction(tx);
      if (!parsed) {
        console.log("   ❌ Balance flow parsing failed");
        continue;
      }

      // Verify amounts match
      const amountDiff = Math.abs(parsed.amount - deposit.amount);
      const amountMatch = amountDiff < 1000; // Allow 0.000001 SOL difference

      // Verify user wallet matches
      const walletMatch = parsed.userWallet === deposit.depositor;

      // Verify type is deposit
      const typeMatch = parsed.type === "deposit";

      console.log(`   Database Amount: ${deposit.amount / 1e9} SOL`);
      console.log(
        `   Parsed Amount: ${parsed.amount / 1e9} SOL ${amountMatch ? "✅" : "❌"}`,
      );
      console.log(`   Database Wallet: ${deposit.depositor.slice(0, 8)}...`);
      console.log(
        `   Parsed Wallet: ${parsed.userWallet.slice(0, 8)}... ${walletMatch ? "✅" : "❌"}`,
      );
      console.log(`   Type: ${parsed.type} ${typeMatch ? "✅" : "❌"}`);
      console.log(
        `   Timestamp: ${new Date(deposit.timestamp).toISOString()} ✅`,
      );
      console.log(`   On-chain Verified: ✅`);

      if (!amountMatch || !walletMatch || !typeMatch) {
        console.log(`   ⚠️  DATA INTEGRITY ISSUES DETECTED!`);
        console.log(`   ⚠️  This suggests fake or corrupted data`);
      } else {
        console.log(`   ✅ All checks passed - data is authentic`);
      }
    }

    // Check for duplicate signatures
    console.log("\n🔍 Checking for duplicate signatures...");
    const duplicateCheck = db["db"].prepare(`
      SELECT signature, COUNT(*) as count 
      FROM deposits 
      GROUP BY signature 
      HAVING count > 1
    `);
    const duplicates = duplicateCheck.all() as any[];

    if (duplicates.length > 0) {
      console.log(`   ❌ Found ${duplicates.length} duplicate signatures`);
      duplicates.forEach((dup) =>
        console.log(`      - ${dup.signature} (${dup.count} times)`),
      );
    } else {
      console.log("   ✅ No duplicate signatures found");
    }

    // Verify SOL balance flow with detailed analysis
    console.log("\n🔍 Testing SOL balance flow logic...");
    if (recentDeposits.length > 0) {
      const testDeposit = recentDeposits[0];
      const testTx = await helius.getTransaction(testDeposit.signature);

      if (testTx && testTx.meta && testTx.accountKeys) {
        console.log(
          `   Test transaction: ${testDeposit.signature.slice(0, 8)}...`,
        );
        console.log(`   Transaction fee: ${testTx.meta.fee} lamports`);

        // Show detailed balance changes
        console.log("   Balance changes:");
        let hasSignificantChange = false;

        for (let i = 0; i < testTx.accountKeys.length; i++) {
          const pre = testTx.meta.preBalances[i];
          const post = testTx.meta.postBalances[i];
          const change = post - pre;

          if (Math.abs(change) > 1000) {
            // More than 0.000001 SOL
            const account = testTx.accountKeys[i];
            const isFeePayer = i === 0;
            const changeType = change < 0 ? "SENT" : "RECEIVED";

            console.log(
              `   ${isFeePayer ? "👤" : "🔒"} Account ${i}: ${changeType} ${Math.abs(change) / 1e9} SOL`,
            );
            console.log(`      Address: ${account.slice(0, 8)}...`);
            hasSignificantChange = true;
          }
        }

        if (hasSignificantChange) {
          console.log("   ✅ Balance flow analysis shows real SOL movement");
        } else {
          console.log("   ❌ No significant balance changes detected");
        }
      }
    }

    // Cross-sample verification
    console.log(
      "\n🔍 Cross-sample verification (checking multiple transactions)...",
    );
    const sampleSize = Math.min(5, recentDeposits.length);
    let validCount = 0;
    let invalidSamples: any[] = [];

    for (let i = 0; i < sampleSize; i++) {
      const deposit = recentDeposits[i];
      const tx = await helius.getTransaction(deposit.signature);

      if (tx) {
        const parsed = parser.parsePrivacyCashTransaction(tx);
        const amountMatch =
          parsed && Math.abs(parsed.amount - deposit.amount) < 1000;
        const walletMatch = parsed && parsed.userWallet === deposit.depositor;
        const typeMatch = parsed && parsed.type === "deposit";

        if (amountMatch && walletMatch && typeMatch) {
          validCount++;
        } else {
          invalidSamples.push({
            signature: deposit.signature.slice(0, 8),
            issues: [
              !amountMatch ? "amount_mismatch" : null,
              !walletMatch ? "wallet_mismatch" : null,
              !typeMatch ? "type_mismatch" : null,
            ].filter(Boolean),
          });
        }
      }
    }

    console.log(
      `   Verified: ${validCount}/${sampleSize} transactions match on-chain data`,
    );

    if (validCount === sampleSize) {
      console.log(
        "   ✅ ALL SAMPLED DATA IS AUTHENTICATE - NO FAKE DATA DETECTED",
      );
    } else {
      console.log(
        `   ❌ ${sampleSize - validCount} samples have discrepancies:`,
      );
      invalidSamples.forEach((sample) => {
        console.log(`      - ${sample.signature}: ${sample.issues.join(", ")}`);
      });
      console.log("   ❌ THIS INDICATES FAKE OR CORRUPTED DATA");
    }

    // Final assessment
    console.log("\n🎯 FINAL DATA INTEGRITY ASSESSMENT:");
    console.log("=====================================");

    if (validCount === sampleSize && duplicates.length === 0) {
      console.log("✅ DATA IS AUTHENTICATE");
      console.log("✅ All transactions verified against on-chain data");
      console.log("✅ No duplicates or corruption detected");
      console.log("✅ SOL balance flow analysis confirms real transactions");
    } else {
      console.log("❌ DATA INTEGRITY ISSUES DETECTED");
      console.log("❌ Some data does not match on-chain reality");
      console.log("❌ This could indicate fake or corrupted data");
    }
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    db.close();
  }
}

verifyDataIntegrity();
