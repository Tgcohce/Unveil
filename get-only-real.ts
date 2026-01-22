/**
 * Get ONLY verified real transactions from on-chain
 */

import { UnveilDatabase } from "./src/indexer/db";
import { HeliusClient } from "./src/indexer/helius-proper";
import { PrivacyCashBalanceParser } from "./src/indexer/privacy-cash-balance";
import dotenv from "dotenv";

dotenv.config();

async function getOnlyRealData() {
  console.log("🔍 Getting ONLY Verified Real Transactions");
  console.log("==========================================\n");

  const cleanDbPath = `./data/unveil_verified_${Date.now()}.db`;
  const heliusApiKey = process.env.HELIUS_API_KEY;

  if (!heliusApiKey) {
    console.error("❌ HELIUS_API_KEY not found");
    return;
  }

  try {
    // Create completely clean database
    const db = new UnveilDatabase(cleanDbPath);
    const helius = new HeliusClient(heliusApiKey);
    const parser = new PrivacyCashBalanceParser();

    console.log(`📁 Creating clean database: ${cleanDbPath}`);

    // Get signatures one by one and verify each one
    console.log("🔍 Fetching and verifying transactions one by one...");

    const signatures = await helius.getSignaturesForAddress(
      "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
      5, // Small number to be careful
    );

    console.log(`📥 Found ${signatures.length} signatures to verify`);

    let deposits: any[] = [];
    let withdrawals: any[] = [];
    let verifiedCount = 0;

    for (let i = 0; i < signatures.length; i++) {
      const sigInfo = signatures[i];
      const sig = sigInfo.signature;

      console.log(`\n${i + 1}. Verifying: ${sig.slice(0, 16)}...`);

      // Get transaction
      const tx = await helius.getTransaction(sig);
      if (!tx) {
        console.log("   ❌ Could not fetch transaction");
        continue;
      }

      // Parse with balance flow
      const parsed = parser.parsePrivacyCashTransaction(tx);
      if (!parsed) {
        console.log("   ❌ Could not parse transaction");
        continue;
      }

      // Verify signature format (88 chars, base58)
      if (sig.length !== 88 || !sig.match(/^[1-9A-HJ-NP-Za-km-z]+$/)) {
        console.log("   ❌ Invalid signature format");
        continue;
      }

      console.log(`   ✅ Type: ${parsed.type.toUpperCase()}`);
      console.log(`   ✅ Amount: ${(parsed.amount / 1e9).toFixed(6)} SOL`);
      console.log(`   ✅ User: ${parsed.userWallet.slice(0, 12)}...`);
      console.log(`   ✅ Slot: ${tx.slot}`);
      console.log(`   ✅ Real format: ${sig.length} chars`);

      // Store parsed transaction
      if (parsed.type === "deposit") {
        const deposit = parser.toDeposit(parsed, tx.slot);
        if (deposit) {
          deposits.push(deposit);
          verifiedCount++;
        }
      } else if (parsed.type === "withdrawal") {
        const withdrawal = parser.toWithdrawal(parsed, tx.slot);
        if (withdrawal) {
          withdrawals.push(withdrawal);
          verifiedCount++;
        }
      }

      // Delay between requests
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log(`\n✅ Verified ${verifiedCount} REAL transactions`);

    // Store only verified real transactions
    if (deposits.length > 0) {
      db.insertDeposits(deposits);
      console.log(`💰 Stored ${deposits.length} verified deposits`);

      // Show each verified deposit
      deposits.forEach((deposit, i) => {
        console.log(
          `   ${i + 1}. ${deposit.signature.slice(0, 16)}... - ${(deposit.amount / 1e9).toFixed(6)} SOL`,
        );
      });
    }

    if (withdrawals.length > 0) {
      db.insertWithdrawals(withdrawals);
      console.log(`💸 Stored ${withdrawals.length} verified withdrawals`);
    }

    // Final verification
    const finalStats = db.getStats();
    console.log("\n📊 Final Verified Database Stats:");
    console.log("==================================");
    console.log(`Deposits: ${finalStats.totalDeposits}`);
    console.log(`Withdrawals: ${finalStats.totalWithdrawals}`);
    console.log(`TVL: ${(finalStats.tvl / 1e9).toFixed(6)} SOL`);
    console.log(`Unique Users: ${finalStats.uniqueDepositors}`);

    // Verify no fake data
    console.log("\n🔍 Double-checking for fake data...");

    const checkStmt = db["db"].prepare("SELECT signature FROM deposits");
    const storedSigs = checkStmt.all() as any[];

    let fakeCount = 0;
    storedSigs.forEach((row) => {
      if (
        row.signature.length !== 88 ||
        !row.signature.match(/^[1-9A-HJ-NP-Za-km-z]+$/)
      ) {
        console.log(`   ❌ Fake signature found: ${row.signature}`);
        fakeCount++;
      }
    });

    if (fakeCount === 0 && finalStats.totalDeposits > 0) {
      console.log("\n🎉 SUCCESS!");
      console.log("✅ 100% REAL ON-CHAIN DATA");
      console.log("✅ NO FAKE TRANSACTIONS");
      console.log("✅ READY FOR PRIVACY ANALYSIS");
      console.log(`\n📁 Clean database: ${cleanDbPath}`);
      console.log("💡 Use this database for analysis");
    } else {
      console.log(`\n❌ Still found ${fakeCount} fake signatures`);
    }

    db.close();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

getOnlyRealData();
