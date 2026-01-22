/**
 * Quick re-index script with working parser
 */

import { HeliusClient } from "./src/indexer/helius-proper";
import { PrivacyCashBalanceParser } from "./src/indexer/privacy-cash-balance";
import { UnveilDatabase } from "./src/indexer/db";
import dotenv from "dotenv";

dotenv.config();

const PROGRAM_ID = "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";
const DB_PATH = "./data/unveil_working.db";

async function reindex() {
  console.log("🔄 Re-indexing with WORKING parser\n");

  const helius = new HeliusClient(process.env.HELIUS_API_KEY!);
  const parser = new PrivacyCashBalanceParser();
  const db = new UnveilDatabase(DB_PATH);

  console.log(`📊 Database: ${DB_PATH}\n`);

  // Fetch recent 500 transactions for better data
  console.log("Fetching signatures...");
  const signatures = await helius.getSignaturesForAddress(PROGRAM_ID, 500);
  console.log(`Found ${signatures.length} signatures\n`);

  let processed = 0;
  let deposits = 0;
  let withdrawals = 0;
  let unknown = 0;

  for (const sig of signatures) {
    try {
      const tx = await helius.getTransaction(sig.signature);

      if (!tx) {
        unknown++;
        continue;
      }

      const parsed = parser.parsePrivacyCashTransaction(tx);

      if (!parsed) {
        unknown++;
      } else {
        if (parsed.type === "deposit") {
          const deposit = parser.toDeposit(parsed, tx.slot);
          if (deposit) {
            db.insertDeposit(deposit);
            deposits++;
          }
        } else if (parsed.type === "withdrawal") {
          const withdrawal = parser.toWithdrawal(parsed, tx.slot);
          if (withdrawal) {
            db.insertWithdrawal(withdrawal);
            withdrawals++;
          }
        }
      }

      processed++;
      if (processed % 10 === 0) {
        console.log(
          `Progress: ${processed}/${signatures.length} | D:${deposits} W:${withdrawals} U:${unknown}`,
        );
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error: any) {
      if (error.message.includes("429")) {
        console.log("⏸️  Rate limited, waiting 2s...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.error(`Error processing ${sig.signature}:`, error.message);
      }
      unknown++;
    }
  }

  const stats = db.getStats();

  console.log(`\n${"=".repeat(60)}`);
  console.log("INDEXING COMPLETE");
  console.log(`${"=".repeat(60)}`);
  console.log(`Total Processed: ${processed}`);
  console.log(`Deposits:        ${deposits} (${stats.totalDeposits} in DB)`);
  console.log(
    `Withdrawals:     ${withdrawals} (${stats.totalWithdrawals} in DB)`,
  );
  console.log(`Unknown:         ${unknown}`);
  console.log(`TVL:             ${(stats.tvl / 1e9).toFixed(2)} SOL`);
  console.log(`Unique Users:    ${stats.uniqueDepositors}`);
  console.log(`${"=".repeat(60)}`);

  db.close();
}

reindex().catch(console.error);
