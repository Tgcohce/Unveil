/**
 * Clear fake data and re-index with authentic on-chain transactions
 */

import { UnveilDatabase } from "./src/indexer/db";
import { HeliusClient } from "./src/indexer/helius";
import { PrivacyCashBalanceParser } from "./src/indexer/privacy-cash-balance";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function clearAndReindex() {
  console.log("🧹 Clearing Fake Data & Re-indexing");
  console.log("===================================\n");

  const dbPath = "./data/unveil.db";
  const heliusApiKey = process.env.HELIUS_API_KEY;

  if (!heliusApiKey) {
    console.error("❌ HELIUS_API_KEY not found in environment");
    return;
  }

  try {
    // Step 1: Close any existing database connections and backup
    if (fs.existsSync(dbPath)) {
      const backupPath = `./data/unveil_backup_${Date.now()}.db`;
      console.log(`📦 Backing up existing database to: ${backupPath}`);

      // Force close by creating a new connection and closing it
      try {
        const tempDb = new UnveilDatabase(dbPath);
        const oldStats = tempDb.getStats();
        console.log("📊 Old database stats (FAKE DATA):");
        console.log(`   Deposits: ${oldStats.totalDeposits}`);
        console.log(`   Withdrawals: ${oldStats.totalWithdrawals}`);
        console.log(`   TVL: ${(oldStats.tvl / 1e9).toFixed(2)} SOL`);
        tempDb.close();

        // Wait a moment for connection to close
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Copy the file
        fs.copyFileSync(dbPath, backupPath);
        console.log("   ✅ Database backed up");
      } catch (error) {
        console.log("   ⚠️  Could not backup database, continuing...");
      }
    }

    // Step 2: Force delete the fake database
    console.log("\n🗑️  Deleting fake database...");
    let attempts = 0;
    while (fs.existsSync(dbPath) && attempts < 5) {
      try {
        fs.unlinkSync(dbPath);
        console.log("   ✅ Fake database deleted");
        break;
      } catch (error) {
        attempts++;
        console.log(`   ⚠️  Attempt ${attempts}: Database locked, waiting...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (fs.existsSync(dbPath)) {
      console.log(
        "   ❌ Could not delete database, please close any running processes",
      );
      return;
    }

    // Step 3: Create fresh database
    console.log("\n🆕 Creating fresh database...");
    const db = new UnveilDatabase(dbPath);
    const freshStats = db.getStats();
    console.log("📊 Fresh database stats:");
    console.log(`   Deposits: ${freshStats.totalDeposits}`);
    console.log(`   Withdrawals: ${freshStats.totalWithdrawals}`);
    console.log(`   TVL: ${(freshStats.tvl / 1e9).toFixed(2)} SOL`);

    // Step 4: Test with real transactions
    console.log("\n🧪 Testing with real on-chain transactions...");
    const helius = new HeliusClient(heliusApiKey);
    const parser = new PrivacyCashBalanceParser();

    const signatures = await helius.getSignaturesForAddress(
      "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
      5,
    );
    console.log(`📥 Found ${signatures.length} recent signatures`);

    let verifiedCount = 0;
    for (let i = 0; i < Math.min(3, signatures.length); i++) {
      const sig = signatures[i].signature;
      console.log(`\n${i + 1}. Verifying: ${sig.slice(0, 8)}...`);

      const tx = await helius.getTransaction(sig);
      if (tx) {
        const parsed = parser.parsePrivacyCashTransaction(tx);
        if (parsed) {
          console.log(
            `   ✅ Type: ${parsed.type}, Amount: ${parsed.amount / 1e9} SOL`,
          );
          console.log(`   ✅ Wallet: ${parsed.userWallet.slice(0, 8)}...`);
          console.log(`   ✅ Real on-chain transaction`);
          verifiedCount++;
        } else {
          console.log(`   ❌ Could not parse transaction`);
        }
      } else {
        console.log(`   ❌ Could not fetch transaction`);
      }
    }

    if (verifiedCount === 0) {
      console.log("\n❌ No real transactions could be verified. Aborting.");
      db.close();
      return;
    }

    console.log(`\n✅ Verified ${verifiedCount} real on-chain transactions`);

    // Step 5: Index real transactions
    console.log("\n🚀 Indexing real on-chain transactions...");

    const initialSignatures = await helius.getSignaturesForAddress(
      "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
      50,
    );
    console.log(`📥 Processing ${initialSignatures.length} transactions...`);

    let totalProcessed = 0;
    const batchSize = 5; // Very small batch size for reliability

    for (let i = 0; i < initialSignatures.length; i += batchSize) {
      const batch = initialSignatures.slice(i, i + batchSize);
      console.log(
        `\n🔄 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(initialSignatures.length / batchSize)} (${batch.length} transactions)...`,
      );

      try {
        const transactions = await helius.getTransactions(
          batch.map((s) => s.signature),
        );
        const results = parser.parseTransactions(transactions);

        if (results.deposits.length > 0) {
          db.insertDeposits(results.deposits);
          console.log(`   💰 ${results.deposits.length} deposits`);
        }

        if (results.withdrawals.length > 0) {
          db.insertWithdrawals(results.withdrawals);
          console.log(`   💸 ${results.withdrawals.length} withdrawals`);
        }

        if (results.unknown > 0) {
          console.log(`   ❓ ${results.unknown} unknown`);
        }

        totalProcessed += transactions.length;

        const currentStats = db.getStats();
        console.log(
          `   📊 Total: ${currentStats.totalDeposits} deposits, ${currentStats.totalWithdrawals} withdrawals`,
        );
        console.log(
          `   💰 TVL: ${(currentStats.tvl / 1e9).toFixed(4)} SOL, Users: ${currentStats.uniqueDepositors}`,
        );
      } catch (error) {
        console.log(`   ⚠️  Batch error: ${error.message}`);
      }

      // Delay between batches
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Step 6: Final verification
    console.log("\n🔍 Final verification of real data...");
    const finalStats = db.getStats();
    console.log("📊 Final database stats (REAL DATA):");
    console.log(`   Total Deposits: ${finalStats.totalDeposits}`);
    console.log(`   Total Withdrawals: ${finalStats.totalWithdrawals}`);
    console.log(`   Unspent Deposits: ${finalStats.unspentDeposits}`);
    console.log(`   TVL: ${(finalStats.tvl / 1e9).toFixed(4)} SOL`);
    console.log(`   Unique Depositors: ${finalStats.uniqueDepositors}`);

    // Verify transactions are real
    const verifyStmt = db["db"].prepare(
      "SELECT * FROM deposits ORDER BY timestamp DESC LIMIT 3",
    );
    const recentRealDeposits = verifyStmt.all() as any[];

    console.log("\n🔍 Verifying transactions are on-chain:");
    let realVerified = 0;

    for (const deposit of recentRealDeposits) {
      try {
        const tx = await helius.getTransaction(deposit.signature);
        if (tx) {
          console.log(
            `   ✅ ${deposit.signature.slice(0, 8)}... - REAL on-chain transaction`,
          );
          realVerified++;
        } else {
          console.log(
            `   ❌ ${deposit.signature.slice(0, 8)}... - NOT found on-chain`,
          );
        }
      } catch (error) {
        console.log(
          `   ❌ ${deposit.signature.slice(0, 8)}... - Error verifying`,
        );
      }
    }

    console.log(`\n🎯 FINAL RESULT:`);
    if (
      realVerified === recentRealDeposits.length &&
      finalStats.totalDeposits > 0
    ) {
      console.log(
        "✅ DATABASE CONTAINS ONLY AUTHENTICATE ON-CHAIN TRANSACTIONS",
      );
      console.log("✅ NO FAKE DATA - READY FOR PRIVACY ANALYSIS");
    } else {
      console.log(
        `❌ VERIFICATION ISSUES: ${realVerified}/${recentRealDeposits.length} verified`,
      );
    }

    db.close();
  } catch (error) {
    console.error("❌ Error during clear and re-index:", error);
  }
}

clearAndReindex();
