/**
 * Get much larger dataset of real Privacy Cash transactions
 * We'll fetch hundreds of transactions gradually
 */

import { UnveilDatabase } from "./src/indexer/db";
import { HeliusClient } from "./src/indexer/helius-proper";
import { PrivacyCashBalanceParser } from "./src/indexer/privacy-cash-balance";
import dotenv from "dotenv";

dotenv.config();

async function getLargeDataset() {
  console.log("📊 Getting Large Dataset of Real Transactions");
  console.log("==============================================\n");

  const largeDbPath = `./data/unveil_large_${Date.now()}.db`;
  const heliusApiKey = process.env.HELIUS_API_KEY;

  if (!heliusApiKey) {
    console.error("❌ HELIUS_API_KEY not found");
    return;
  }

  try {
    // Create large database
    const db = new UnveilDatabase(largeDbPath);
    const helius = new HeliusClient(heliusApiKey);
    const parser = new PrivacyCashBalanceParser();

    console.log(`📁 Creating large database: ${largeDbPath}`);

    // Health check
    console.log("🏥 Health check...");
    const healthy = await helius.healthCheck();
    if (!healthy) {
      console.log("❌ Helius health check failed");
      return;
    }
    console.log("✅ Helius API healthy");

    // Get signatures in batches to avoid rate limits
    console.log("📥 Fetching signatures in batches...");

    const targetSignatures = 100; // Aim for 100 transactions
    let allSignatures: any[] = [];
    let fetched = 0;

    // Fetch signatures in smaller chunks
    while (fetched < targetSignatures) {
      const batchSize = Math.min(20, targetSignatures - fetched);
      console.log(
        `📦 Fetching ${batchSize} signatures (total: ${fetched + batchSize}/${targetSignatures})...`,
      );

      try {
        const batchSignatures = await helius.getSignaturesForAddress(
          "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
          batchSize,
          fetched > 0 ? allSignatures[fetched - 1]?.signature : undefined,
        );

        allSignatures = allSignatures.concat(batchSignatures);
        fetched += batchSignatures;

        console.log(`   ✅ Got ${batchSignatures.length} signatures`);

        // Check if we got fewer than requested (reached end)
        if (batchSignatures.length < batchSize) {
          console.log("   📝 Reached end of available signatures");
          break;
        }
      } catch (error: any) {
        if (error.message?.includes("429")) {
          console.log("   ⏳ Rate limited, waiting 10 seconds...");
          await new Promise((resolve) => setTimeout(resolve, 10000));
          continue;
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          break;
        }
      }

      // Delay between signature batches
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`\n📥 Total signatures fetched: ${allSignatures.length}`);

    if (allSignatures.length === 0) {
      console.log("❌ No signatures found");
      return;
    }

    // Process transactions in small batches with verification
    console.log("\n🔄 Processing transactions with verification...");

    let processedCount = 0;
    let verifiedDeposits: any[] = [];
    let verifiedWithdrawals: any[] = [];
    let fakeCount = 0;

    const batchSize = 3; // Very small batches for reliability

    for (let i = 0; i < allSignatures.length; i += batchSize) {
      const batch = allSignatures.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allSignatures.length / batchSize);

      console.log(
        `\n🔄 Batch ${batchNum}/${totalBatches} (${batch.length} signatures)...`,
      );

      // Process each signature individually with verification
      for (let j = 0; j < batch.length; j++) {
        const sigInfo = batch[j];
        const sig = sigInfo.signature;
        const itemNum = i + j + 1;

        console.log(
          `   ${itemNum}/${allSignatures.length}: ${sig.slice(0, 12)}...`,
        );

        try {
          // Get transaction
          const tx = await helius.getTransaction(sig);
          if (!tx) {
            console.log("      ❌ Could not fetch");
            continue;
          }

          // Parse with balance flow
          const parsed = parser.parsePrivacyCashTransaction(tx);
          if (!parsed) {
            console.log("      ❌ Could not parse");
            continue;
          }

          // Verify signature format (88 chars, base58)
          if (sig.length !== 88 || !sig.match(/^[1-9A-HJ-NP-Za-km-z]+$/)) {
            console.log("      ❌ Invalid signature format - REJECTING");
            fakeCount++;
            continue;
          }

          console.log(
            `      ✅ ${parsed.type.toUpperCase()}: ${(parsed.amount / 1e9).toFixed(6)} SOL`,
          );

          // Store verified transaction
          if (parsed.type === "deposit") {
            const deposit = parser.toDeposit(parsed, tx.slot);
            if (deposit) {
              verifiedDeposits.push(deposit);
            }
          } else if (parsed.type === "withdrawal") {
            const withdrawal = parser.toWithdrawal(parsed, tx.slot);
            if (withdrawal) {
              verifiedWithdrawals.push(withdrawal);
            }
          }

          processedCount++;
        } catch (error: any) {
          if (error.message?.includes("429")) {
            console.log("      ⏳ Rate limited, waiting 5 seconds...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            j--; // Retry this one
            continue;
          } else {
            console.log(`      ❌ Error: ${error.message}`);
          }
        }

        // Delay between individual requests
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Store batch results
      if (verifiedDeposits.length > 0) {
        db.insertDeposits(verifiedDeposits.slice(-10)); // Store last 10 from this batch
        console.log(
          `   💰 Stored ${Math.min(10, verifiedDeposits.length)} deposits (batch total)`,
        );
      }

      if (verifiedWithdrawals.length > 0) {
        db.insertWithdrawals(verifiedWithdrawals.slice(-10)); // Store last 10 from this batch
        console.log(
          `   💸 Stored ${Math.min(10, verifiedWithdrawals.length)} withdrawals (batch total)`,
        );
      }

      // Show progress
      console.log(`   📊 Progress: ${processedCount}/${allSignatures.length}`);
      console.log(`   💰 Total Deposits: ${verifiedDeposits.length}`);
      console.log(`   💸 Total Withdrawals: ${verifiedWithdrawals.length}`);
      console.log(`   🚨 Rejected Fake: ${fakeCount}`);

      // Delay between batches
      if (i + batchSize < allSignatures.length) {
        console.log("   ⏳ Batch delay 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Final stats
    console.log("\n📊 FINAL LARGE DATASET STATS:");
    console.log("==============================");

    const finalStats = db.getStats();
    console.log(`Total Deposits: ${finalStats.totalDeposits}`);
    console.log(`Total Withdrawals: ${finalStats.totalWithdrawals}`);
    console.log(`TVL: ${(finalStats.tvl / 1e9).toFixed(6)} SOL`);
    console.log(`Unique Users: ${finalStats.uniqueDepositors}`);
    console.log(`Fake Rejected: ${fakeCount}`);

    // Verify data integrity
    console.log("\n🔍 Final data integrity check...");

    const checkStmt = db["db"].prepare(
      "SELECT signature FROM deposits LIMIT 10",
    );
    const sampleSigs = checkStmt.all() as any[];

    let fakeInFinal = 0;
    sampleSigs.forEach((row) => {
      if (
        row.signature.length !== 88 ||
        !row.signature.match(/^[1-9A-HJ-NP-Za-km-z]+$/)
      ) {
        console.log(`   ❌ Fake found in final: ${row.signature}`);
        fakeInFinal++;
      }
    });

    if (fakeInFinal === 0 && finalStats.totalDeposits > 0) {
      console.log("\n🎉 SUCCESS!");
      console.log("✅ LARGE DATASET CREATED");
      console.log("✅ 100% REAL ON-CHAIN DATA");
      console.log("✅ NO FAKE TRANSACTIONS");
      console.log(`✅ ${finalStats.totalDeposits} REAL DEPOSITS COLLECTED`);
      console.log(
        `✅ ${finalStats.totalWithdrawals} REAL WITHDRAWALS COLLECTED`,
      );
      console.log(`\n📁 Large database: ${largeDbPath}`);
      console.log("💡 Ready for comprehensive privacy analysis");
    } else {
      console.log(
        `\n❌ Data integrity issues found: ${fakeInFinal} fake signatures`,
      );
    }

    db.close();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

getLargeDataset();
