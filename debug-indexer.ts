/**
 * Debug indexer - Run with latest transactions to see parser output
 */

import { HeliusClient } from "./src/indexer/helius-proper";
import { PrivacyCashBalanceParser } from "./src/indexer/privacy-cash-balance";
import dotenv from "dotenv";

dotenv.config();

// Enable debug mode
process.env.DEBUG_PRIVACY_CASH = "true";

const PROGRAM_ID = "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";

async function debugIndexer() {
  console.log("🔍 Debug Indexer - Testing Parser\n");

  const helius = new HeliusClient(process.env.HELIUS_API_KEY!);
  const parser = new PrivacyCashBalanceParser();

  // Fetch latest 10 transactions
  console.log("Fetching latest 10 transactions...\n");
  const signatures = await helius.getSignaturesForAddress(PROGRAM_ID, 10);

  console.log(`Found ${signatures.length} signatures\n`);

  let deposits = 0;
  let withdrawals = 0;
  let unknown = 0;

  for (const sig of signatures) {
    try {
      console.log(`\n${"=".repeat(80)}`);
      console.log(`Processing: ${sig.signature}`);
      console.log(`${"=".repeat(80)}`);

      const tx = await helius.getTransaction(sig.signature);

      if (!tx) {
        console.log("❌ No transaction data");
        unknown++;
        continue;
      }

      const parsed = parser.parsePrivacyCashTransaction(tx);

      if (!parsed) {
        console.log("❌ Parser returned null");
        unknown++;
      } else {
        console.log(`✅ Parsed as: ${parsed.type.toUpperCase()}`);
        console.log(`   Amount: ${parsed.amount / 1e9} SOL`);
        console.log(`   Wallet: ${parsed.userWallet}`);

        if (parsed.type === "deposit") deposits++;
        else if (parsed.type === "withdrawal") withdrawals++;
      }

      // Wait to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
      unknown++;
    }
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(80)}`);
  console.log(`Deposits:    ${deposits}`);
  console.log(`Withdrawals: ${withdrawals}`);
  console.log(`Unknown:     ${unknown}`);
  console.log(`Total:       ${signatures.length}`);
}

debugIndexer().catch(console.error);
