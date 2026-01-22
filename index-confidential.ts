/**
 * Index Confidential Transfers from Solana Token-2022
 *
 * Quick indexing script to fetch recent CT transactions
 */

import dotenv from "dotenv";
import { ConfidentialTransferIndexer } from "./src/indexer/confidential-transfers";
import { ConfidentialTransferAnalysis } from "./src/analysis/confidential-analysis";
import { UnveilDatabase } from "./src/indexer/db";

dotenv.config();

async function main() {
  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    throw new Error("HELIUS_API_KEY not set in .env");
  }

  const dbPath = process.env.DATABASE_PATH || "./data/unveil_working.db";
  console.log(`Using database: ${dbPath}`);

  const db = new UnveilDatabase(dbPath);
  const indexer = new ConfidentialTransferIndexer(heliusApiKey);
  const analyzer = new ConfidentialTransferAnalysis();

  console.log("\n📡 Fetching Token-2022 Confidential Transfers...");
  console.log("=".repeat(60));

  try {
    // Fetch up to 100 transactions (to avoid rate limits)
    const transfers = await indexer.fetchConfidentialTransfers(100);

    console.log(`\n✅ Found ${transfers.length} confidential transfers`);

    if (transfers.length === 0) {
      console.log("\n⚠️  No confidential transfers found!");
      console.log("This could mean:");
      console.log("  - Token-2022 CT feature is not widely adopted yet");
      console.log("  - Need to search different token mints");
      console.log("  - API might need different query parameters");
      db.close();
      return;
    }

    // Save to database
    console.log("\n💾 Saving to database...");
    db.insertConfidentialTransfers(transfers);

    // Aggregate accounts and mints
    console.log("📊 Aggregating accounts and mints...");
    const accounts = await indexer.aggregateAccounts(transfers);
    const mints = await indexer.aggregateMints(transfers);

    // Save aggregations
    for (const account of accounts.values()) {
      db.upsertConfidentialAccount(account);
    }

    for (const mint of mints.values()) {
      db.upsertConfidentialMint(mint);
    }

    console.log(`\n✅ Saved ${accounts.size} accounts, ${mints.size} mints`);

    // Run analysis
    console.log("\n🔍 Running privacy analysis...");
    console.log("=".repeat(60));

    const result = analyzer.analyze(transfers, accounts, mints);

    // Print summary
    console.log(analyzer.generateSummary(result));

    // Database stats
    console.log("\n📈 Database Stats:");
    console.log("=".repeat(60));
    const stats = db.getConfidentialTransfersStats();
    console.log(`Total transfers: ${stats.total_transfers}`);
    console.log(`Unique mints: ${stats.unique_mints}`);
    console.log(
      `Unique users: ${Math.max(stats.unique_source_owners, stats.unique_destination_owners)}`,
    );
    console.log(`Auditors: ${stats.unique_auditors}`);
    console.log(
      `First transfer: ${new Date(stats.first_transfer).toISOString()}`,
    );
    console.log(
      `Last transfer: ${new Date(stats.last_transfer).toISOString()}`,
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    db.close();
    console.log("\n✅ Done!");
  }
}

main();
