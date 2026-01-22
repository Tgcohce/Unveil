/**
 * Main indexer for Privacy Cash transactions
 * Fetches, parses, and stores deposits and withdrawals
 */

import dotenv from "dotenv";
import { HeliusClient } from "./helius";
import { PrivacyCashBalanceParser } from "./privacy-cash-balance";
import { UnveilDatabase } from "./db";
import { IndexerConfig } from "./types";

dotenv.config();

export class PrivacyCashIndexer {
  private helius: HeliusClient;
  private parser: PrivacyCashBalanceParser;
  private db: UnveilDatabase;
  private config: IndexerConfig;
  private isRunning: boolean = false;

  constructor(config: IndexerConfig) {
    this.config = config;
    this.helius = new HeliusClient(config.heliusApiKey);
    this.parser = new PrivacyCashBalanceParser();
    this.db = new UnveilDatabase(config.databasePath);
  }

  /**
   * Start the indexer
   * @param fromBeginning If true, index all historical transactions
   */
  async start(fromBeginning: boolean = false): Promise<void> {
    if (this.isRunning) {
      console.log("Indexer is already running");
      return;
    }

    this.isRunning = true;
    console.log("🚀 Starting Privacy Cash indexer...");

    // Health check
    const healthy = await this.helius.healthCheck();
    if (!healthy) {
      console.error("❌ Helius API health check failed. Check your API key.");
      this.isRunning = false;
      return;
    }

    console.log("✅ Helius API connected");

    // Get last indexed state
    const state = this.db.getIndexerState();
    const startSignature = fromBeginning ? undefined : state.lastSignature;

    console.log(`📊 Current state: ${state.totalIndexed} transactions indexed`);
    if (startSignature) {
      console.log(
        `📍 Resuming from signature: ${startSignature.slice(0, 8)}...`,
      );
    } else {
      console.log("📍 Starting from the beginning");
    }

    await this.indexTransactions(startSignature);
  }

  /**
   * Index transactions in batches
   */
  private async indexTransactions(beforeSignature?: string): Promise<void> {
    let currentCursor = beforeSignature;
    let totalProcessed = 0;
    let lastSlot = 0;

    while (this.isRunning) {
      try {
        // Fetch signatures
        console.log(
          `\n🔍 Fetching signatures (batch size: ${this.config.batchSize})...`,
        );
        const signatures = await this.helius.getSignaturesForAddress(
          this.config.programId,
          this.config.batchSize,
          currentCursor,
        );

        if (signatures.length === 0) {
          console.log("✅ No more transactions to index. Reached the end.");
          break;
        }

        console.log(`📥 Fetched ${signatures.length} signatures`);

        // Fetch full transactions
        console.log("📦 Fetching transaction details...");
        const transactions = await this.helius.getTransactions(
          signatures.map((s) => s.signature),
          10, // Batch size for parallel fetching
        );

        console.log(`✅ Fetched ${transactions.length} transactions`);

        // Parse transactions
        console.log("🔬 Parsing transactions...");
        const { deposits, withdrawals, unknown } =
          this.parser.parseTransactions(transactions);

        console.log(
          `📊 Parsed: ${deposits.length} deposits, ${withdrawals.length} withdrawals, ${unknown} unknown`,
        );

        // Store in database
        if (deposits.length > 0) {
          console.log("💾 Storing deposits...");
          this.db.insertDeposits(deposits);
        }

        if (withdrawals.length > 0) {
          console.log("💾 Storing withdrawals...");
          this.db.insertWithdrawals(withdrawals);
        }

        // Update indexer state
        if (signatures.length > 0) {
          const lastSignature = signatures[signatures.length - 1];
          lastSlot = Math.max(lastSlot, lastSignature.slot);
          currentCursor = lastSignature.signature;

          const state = this.db.getIndexerState();
          this.db.updateIndexerState(
            currentCursor,
            lastSlot,
            state.totalIndexed + transactions.length,
          );
        }

        totalProcessed += transactions.length;

        // Show progress
        const stats = this.db.getStats();
        console.log(`\n📈 Progress:`);
        console.log(`   Total processed: ${totalProcessed} transactions`);
        console.log(
          `   Database: ${stats.totalDeposits} deposits, ${stats.totalWithdrawals} withdrawals`,
        );
        console.log(`   Unspent: ${stats.unspentDeposits} deposits`);
        console.log(`   TVL: ${(stats.tvl / 1e9).toFixed(2)} SOL`);
        console.log(`   Unique depositors: ${stats.uniqueDepositors}`);

        // Check if we got fewer signatures than requested (means we're at the end)
        if (signatures.length < this.config.batchSize) {
          console.log("\n✅ Reached the end of transaction history");
          break;
        }

        // Delay between batches to avoid rate limiting
        await this.delay(this.config.delayMs);
      } catch (error) {
        console.error("❌ Error during indexing:", error);
        // Continue on error (transient network issues)
        await this.delay(5000);
      }
    }

    console.log("\n🎉 Indexing complete!");
    this.isRunning = false;
  }

  /**
   * Stop the indexer
   */
  stop(): void {
    console.log("🛑 Stopping indexer...");
    this.isRunning = false;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI entry point
if (require.main === module) {
  const config: IndexerConfig = {
    heliusApiKey: process.env.HELIUS_API_KEY!,
    programId:
      process.env.PRIVACY_CASH_PROGRAM_ID ||
      "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
    batchSize: parseInt(process.env.INDEX_BATCH_SIZE || "1000"),
    delayMs: parseInt(process.env.INDEX_DELAY_MS || "100"),
    databasePath: process.env.DATABASE_PATH || "./data/unveil.db",
  };

  if (!config.heliusApiKey) {
    console.error("❌ HELIUS_API_KEY environment variable is required");
    console.error("   Get your free API key at: https://dev.helius.xyz");
    process.exit(1);
  }

  const indexer = new PrivacyCashIndexer(config);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Received SIGINT, shutting down gracefully...");
    indexer.stop();
    setTimeout(() => {
      indexer.close();
      process.exit(0);
    }, 1000);
  });

  // Check if --from-beginning flag is passed
  const fromBeginning = process.argv.includes("--from-beginning");

  indexer.start(fromBeginning).catch((error) => {
    console.error("Fatal error:", error);
    indexer.close();
    process.exit(1);
  });
}
