/**
 * Force create fresh database and index real transactions
 */

import { UnveilDatabase } from "./src/indexer/db";
import { HeliusClient } from "./src/indexer/helius";
import { PrivacyCashBalanceParser } from "./src/indexer/privacy-cash-balance";
import dotenv from "dotenv";

dotenv.config();

async function createFreshAndIndex() {
  console.log("🆕 Creating Fresh Database with Real Data");
  console.log("======================================\n");

  const newDbPath = `./data/unveil_fresh_${Date.now()}.db`;
  const heliusApiKey = process.env.HELIUS_API_KEY;

  if (!heliusApiKey) {
    console.error("❌ HELIUS_API_KEY not found in environment");
    return;
  }

  try {
    // Create completely fresh database
    console.log(`🆕 Creating fresh database: ${newDbPath}`);
    const db = new UnveilDatabase(newDbPath);

    const freshStats = db.getStats();
    console.log("📊 Fresh database stats:");
    console.log(`   Deposits: ${freshStats.totalDeposits}`);
    console.log(`   Withdrawals: ${freshStats.totalWithdrawals}`);
    console.log(`   TVL: ${(freshStats.tvl / 1e9).toFixed(2)} SOL`);

    // Test connectivity first
    console.log("\n🔌 Testing Helius connectivity...");
    const helius = new HeliusClient(heliusApiKey);
    const healthCheck = await helius.healthCheck();

    if (!healthCheck) {
      console.log("❌ Helius API health check failed");
      return;
    }
    console.log("✅ Helius API connected");

    // Test SOL balance flow parser
    console.log("\n🧪 Testing SOL balance flow parser...");
    const parser = new PrivacyCashBalanceParser();

    // Get a few recent signatures
    const testSignatures = await helius.getSignaturesForAddress(
      "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
      3,
    );
    console.log(`📥 Found ${testSignatures.length} test signatures`);

    let testVerified = 0;
    for (let i = 0; i < testSignatures.length; i++) {
      const sig = testSignatures[i].signature;
      console.log(`\n${i + 1}. Testing: ${sig.slice(0, 12)}...`);

      try {
        const tx = await helius.getTransaction(sig);
        if (tx) {
          const parsed = parser.parsePrivacyCashTransaction(tx);
          if (parsed) {
            console.log(`   ✅ Type: ${parsed.type.toUpperCase()}`);
            console.log(
              `   ✅ Amount: ${(parsed.amount / 1e9).toFixed(6)} SOL`,
            );
            console.log(`   ✅ User: ${parsed.userWallet.slice(0, 12)}...`);
            console.log(`   ✅ Real on-chain transaction`);
            testVerified++;
          } else {
            console.log(`   ❓ Could not parse (unknown transaction type)`);
          }
        } else {
          console.log(`   ❌ Could not fetch transaction`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    if (testVerified === 0) {
      console.log(
        "\n❌ No transactions could be verified. Check parser or API.",
      );
      return;
    }

    console.log(`\n✅ Successfully tested ${testVerified} real transactions`);

    // Now index real transactions
    console.log("\n🚀 Indexing REAL on-chain transactions...");
    console.log("   This may take a while due to rate limits...\n");

    const signaturesToIndex = await helius.getSignaturesForAddress(
      "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
      30,
    );
    console.log(`📥 Indexing ${signaturesToIndex.length} transactions...`);

    let processedCount = 0;
    const batchSize = 3; // Very small batches to avoid rate limits

    for (let i = 0; i < signaturesToIndex.length; i += batchSize) {
      const batch = signaturesToIndex.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(signaturesToIndex.length / batchSize);

      console.log(
        `\n🔄 Batch ${batchNum}/${totalBatches} (${batch.length} transactions)...`,
      );

      try {
        // Fetch transactions
        const transactions = await helius.getTransactions(
          batch.map((s) => s.signature),
        );
        console.log(`   📦 Fetched ${transactions.length} transactions`);

        // Parse with SOL balance flow
        const results = parser.parseTransactions(transactions);
        console.log(
          `   🔬 Parsed: ${results.deposits.length} deposits, ${results.withdrawals.length} withdrawals, ${results.unknown} unknown`,
        );

        // Store in database
        if (results.deposits.length > 0) {
          db.insertDeposits(results.deposits);
          console.log(`   💰 Stored ${results.deposits.length} deposits`);
        }

        if (results.withdrawals.length > 0) {
          db.insertWithdrawals(results.withdrawals);
          console.log(`   💸 Stored ${results.withdrawals.length} withdrawals`);
        }

        processedCount += transactions.length;

        // Show current stats
        const currentStats = db.getStats();
        console.log(
          `   📊 Progress: ${processedCount}/${signaturesToIndex.length}`,
        );
        console.log(`   💰 TVL: ${(currentStats.tvl / 1e9).toFixed(4)} SOL`);
        console.log(`   👥 Users: ${currentStats.uniqueDepositors}`);
        console.log(
          `   🏦 Active: ${currentStats.totalDeposits - currentStats.totalWithdrawals}`,
        );
      } catch (error) {
        console.log(`   ⚠️  Batch error: ${error.message}`);
      }

      // Delay between batches
      if (i + batchSize < signaturesToIndex.length) {
        console.log(`   ⏳ Waiting 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Final verification
    console.log("\n🔍 Final verification of indexed data...");
    const finalStats = db.getStats();

    console.log("\n📊 FINAL DATABASE STATS (REAL DATA):");
    console.log(`==========================================`);
    console.log(`Total Deposits: ${finalStats.totalDeposits}`);
    console.log(`Total Withdrawals: ${finalStats.totalWithdrawals}`);
    console.log(`Unspent Deposits: ${finalStats.unspentDeposits}`);
    console.log(`TVL: ${(finalStats.tvl / 1e9).toFixed(6)} SOL`);
    console.log(`Unique Depositors: ${finalStats.uniqueDepositors}`);

    // Verify some transactions are real
    if (finalStats.totalDeposits > 0) {
      console.log("\n🔍 Verifying transactions exist on-chain...");
      const verifyStmt = db["db"].prepare(
        "SELECT * FROM deposits ORDER BY timestamp DESC LIMIT 3",
      );
      const recentDeposits = verifyStmt.all() as any[];

      let verifiedReal = 0;
      for (const deposit of recentDeposits) {
        try {
          const tx = await helius.getTransaction(deposit.signature);
          if (tx) {
            console.log(
              `   ✅ ${deposit.signature.slice(0, 12)}... - REAL transaction`,
            );
            verifiedReal++;
          } else {
            console.log(
              `   ❌ ${deposit.signature.slice(0, 12)}... - NOT on-chain`,
            );
          }
        } catch (error) {
          console.log(
            `   ❌ ${deposit.signature.slice(0, 12)}... - Error verifying`,
          );
        }
      }

      // Final assessment
      console.log("\n🎯 DATA INTEGRITY ASSESSMENT:");
      console.log("===============================");

      if (
        verifiedReal === recentDeposits.length &&
        finalStats.totalDeposits > 0
      ) {
        console.log("✅ AUTHENTICATE DATA ONLY");
        console.log("✅ All verified transactions exist on-chain");
        console.log("✅ NO FAKE DATA DETECTED");
        console.log("✅ Ready for privacy analysis");
        console.log(`\n📁 Database saved as: ${newDbPath}`);
        console.log(
          "💡 To use this database, update your DATABASE_PATH environment variable",
        );
      } else {
        console.log("❌ DATA INTEGRITY ISSUES");
        console.log(
          `❌ ${recentDeposits.length - verifiedReal} transactions could not be verified`,
        );
      }
    } else {
      console.log("❌ No deposits were indexed");
    }

    db.close();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

createFreshAndIndex();
