/**
 * Index ShadowWire transfers from Solana
 *
 * ShadowWire uses Bulletproofs to hide amounts but addresses remain visible.
 * This script indexes transfers from the ShadowWire pool.
 */

import dotenv from "dotenv";
import { ShadowWireIndexer } from "./src/indexer/shadowwire";
import { ShadowWireAttack } from "./src/analysis/shadowwire-attack";
import { UnveilDatabase } from "./src/indexer/db";

dotenv.config();

async function main() {
  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    throw new Error("HELIUS_API_KEY not set in .env");
  }

  const dbPath = process.env.DATABASE_PATH || "./data/unveil_amounts.db";
  console.log(`Using database: ${dbPath}\n`);

  const db = new UnveilDatabase(dbPath);
  const indexer = new ShadowWireIndexer(heliusApiKey);
  const analyzer = new ShadowWireAttack();

  console.log("\n🔒 Fetching ShadowWire Transfers...");
  console.log("=".repeat(60));

  try {
    // Fetch up to 200 transactions (reduced to avoid rate limits)
    console.log("Fetching recent pool activity...");
    const transfers = await indexer.fetchTransfers(200);

    console.log(`\n✅ Found ${transfers.length} ShadowWire transfers`);

    if (transfers.length === 0) {
      console.log("\n⚠️  No ShadowWire transfers found!");
      console.log("This could mean:");
      console.log("  - ShadowWire has low adoption on mainnet");
      console.log("  - The pool hasn't been used recently");
      console.log("  - Need to check different time windows");
      db.close();
      return;
    }

    // Save to database
    console.log("\n💾 Saving to database...");
    db.insertShadowWireTransfers(transfers);

    // Aggregate accounts
    console.log("📊 Aggregating accounts...");
    const accounts = await indexer.aggregateAccounts(transfers);

    // Save aggregations
    for (const account of accounts.values()) {
      db.upsertShadowWireAccount(account);
    }

    console.log(`\n✅ Saved ${accounts.size} accounts`);

    // Run analysis
    console.log("\n🔍 Running privacy analysis...");
    console.log("=".repeat(60));

    const result = analyzer.analyze(transfers, accounts);

    // Print summary
    console.log(analyzer.generateSummary(result));

    // Database stats
    console.log("\n📈 Database Stats:");
    console.log("=".repeat(60));
    const stats = db.getShadowWireStats();
    console.log(`Total transfers: ${stats.total_transfers}`);
    console.log(`Unique senders: ${stats.unique_senders}`);
    console.log(`Unique recipients: ${stats.unique_recipients}`);
    console.log(
      `Internal transfers: ${stats.internal_transfers} (amounts hidden)`,
    );
    console.log(
      `External transfers: ${stats.external_transfers} (amounts visible)`,
    );
    console.log(
      `First transfer: ${new Date(stats.first_transfer).toISOString()}`,
    );
    console.log(
      `Last transfer: ${new Date(stats.last_transfer).toISOString()}`,
    );

    // Key findings
    console.log("\n🎯 KEY FINDINGS:");
    console.log("=".repeat(60));
    console.log(
      `1. Privacy Score: ${result.privacyScore}/100 (Privacy Cash: 16/100)`,
    );
    console.log(
      `2. Linkability: ${Math.round(result.linkabilityRate)}% of transfers can be linked`,
    );
    console.log(
      `3. Address Visibility: Sender/recipient addresses are VISIBLE on-chain`,
    );
    console.log(
      `4. Amount Hiding: Bulletproofs hide amounts but timing + addresses leak info`,
    );
    console.log(
      `5. Anonymity Sets: Average ${result.avgAnonymitySet.toFixed(1)} (lower = worse)`,
    );

    console.log("\n💡 CONCLUSION:");
    console.log("=".repeat(60));
    if (result.privacyScore > 16) {
      console.log("✅ ShadowWire provides better privacy than Privacy Cash");
      console.log("   (Bulletproofs > visible amounts for privacy)");
    } else {
      console.log("⚠️  ShadowWire has similar/worse privacy than Privacy Cash");
      console.log("   (Visible addresses defeat Bulletproof protection)");
    }
    console.log(
      "\n⚠️  BOTH protocols are vulnerable to timing correlation attacks!",
    );
    console.log(
      "⚠️  True privacy requires: Address privacy + Amount privacy + Timing obfuscation",
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    db.close();
    console.log("\n✅ Done!");
  }
}

main();
