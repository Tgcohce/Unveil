/**
 * Test script for Privacy Cash balance flow parser
 * Tests on 10 transactions with detailed logging
 */

import { HeliusClient } from "./src/indexer/helius";
import { PrivacyCashBalanceParser } from "./src/indexer/privacy-cash-balance";
import dotenv from "dotenv";

dotenv.config();

const PROGRAM_ID = "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";

async function testBalanceFlowParser() {
  console.log("🧪 Testing Privacy Cash Balance Flow Parser");
  console.log("==========================================\n");

  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    console.error("❌ HELIUS_API_KEY not found in environment");
    return;
  }

  const helius = new HeliusClient(heliusApiKey);
  const parser = new PrivacyCashBalanceParser();

  try {
    // Get recent signatures
    console.log("📡 Fetching recent signatures...");
    const signatures = await helius.getSignaturesForAddress(PROGRAM_ID, 10);
    console.log(`Found ${signatures.length} recent signatures\n`);

    // Fetch transactions
    console.log("📦 Fetching transactions...");
    const transactions = await helius.getTransactions(
      signatures.map((s) => s.signature),
    );
    console.log(`Fetched ${transactions.length} transactions\n`);

    // Parse with balance flow
    console.log("🔍 Parsing with balance flow analysis...");
    const results = parser.parseTransactions(transactions);

    console.log("\n📊 Results:");
    console.log(`- Deposits: ${results.deposits.length}`);
    console.log(`- Withdrawals: ${results.withdrawals.length}`);
    console.log(`- Unknown: ${results.unknown}`);

    // Show detailed results
    if (results.deposits.length > 0) {
      console.log("\n💰 Deposits:");
      results.deposits.forEach((d, i) => {
        console.log(
          `  ${i + 1}. ${d.signature} - ${d.amount / 1e9} SOL from ${d.depositor}`,
        );
      });
    }

    if (results.withdrawals.length > 0) {
      console.log("\n💸 Withdrawals:");
      results.withdrawals.forEach((w, i) => {
        console.log(
          `  ${i + 1}. ${w.signature} - ${w.amount / 1e9} SOL to ${w.recipient}`,
        );
      });
    }

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run with debug logging
process.env.DEBUG_PRIVACY_CASH = "true";
testBalanceFlowParser();
