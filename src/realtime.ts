/**
 * Real-Time Orchestrator
 *
 * Main entry point for live research sessions.
 * Wires together: EventBus → Indexers → RealtimeAnalyzer → WebSocket → Dashboard
 *
 * Usage: npm run realtime
 */

import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { UnveilDatabase } from "./indexer/db";
import { UnveilEventBus } from "./indexer/event-bus";
import { PrivacyCashIndexer } from "./indexer/index";
import { ShadowWireIndexer } from "./indexer/shadowwire";
import { SilentSwapIndexer } from "./indexer/silentswap";
import { RealtimeAnalyzer } from "./analysis/realtime";
import { createApp, createWebSocketServer } from "./api/server";

const PORT = parseInt(process.env.PORT || "3005");
const DB_PATH = process.env.DATABASE_PATH || "./data/unveil.db";
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

async function main() {
  if (!HELIUS_API_KEY) {
    console.error("❌ HELIUS_API_KEY environment variable is required");
    console.error("   Get your free API key at: https://dev.helius.xyz");
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════");
  console.log("  UNVEIL — Live Security Research Platform");
  console.log("═══════════════════════════════════════════\n");

  // 1. Init DB + EventBus
  const db = new UnveilDatabase(DB_PATH);
  const eventBus = new UnveilEventBus();

  // 2. Create Express app + HTTP server + WebSocket server
  const app = createApp(db);
  const server = http.createServer(app);
  const { broadcast } = createWebSocketServer(server);

  // 3. Start RealtimeAnalyzer (subscribes to EventBus)
  const analyzer = new RealtimeAnalyzer(eventBus, db);
  analyzer.start();

  // 4. Wire EventBus → WebSocket broadcast
  eventBus.on("deposit:new", (payload) => {
    broadcast("transactions", {
      type: "deposit",
      protocol: payload.protocol,
      ...payload.deposit,
    });
  });

  eventBus.on("withdrawal:new", (payload) => {
    broadcast("transactions", {
      type: "withdrawal",
      protocol: payload.protocol,
      ...payload.withdrawal,
    });
  });

  eventBus.on("shadowwire:transfer", (transfer) => {
    broadcast("transactions", {
      type: "shadowwire_transfer",
      protocol: "ShadowWire",
      ...transfer,
    });
  });

  eventBus.on("silentswap:input", (input) => {
    broadcast("transactions", {
      type: "silentswap_input",
      protocol: "SilentSwap",
      ...input,
    });
  });

  eventBus.on("silentswap:output", (output) => {
    broadcast("transactions", {
      type: "silentswap_output",
      protocol: "SilentSwap",
      ...output,
    });
  });

  eventBus.on("match:found", (payload) => {
    broadcast("matches", payload);
  });

  eventBus.on("indexer:status", (payload) => {
    broadcast("status", payload);
  });

  eventBus.on("metrics:updated", (payload) => {
    broadcast("metrics", payload);
  });

  // 5. Start HTTP + WS server
  server.listen(PORT, () => {
    console.log(`🚀 API + WebSocket server on http://localhost:${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`📊 Database: ${DB_PATH}\n`);
  });

  // 6. Run indexers sequentially
  console.log("🔄 Starting indexer run...\n");

  try {
    // Privacy Cash
    eventBus.emit("indexer:status", { protocol: "Privacy Cash", status: "starting" });
    const pcIndexer = new PrivacyCashIndexer(
      {
        heliusApiKey: HELIUS_API_KEY,
        programId:
          process.env.PRIVACY_CASH_PROGRAM_ID ||
          "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
        batchSize: parseInt(process.env.INDEX_BATCH_SIZE || "1000"),
        delayMs: parseInt(process.env.INDEX_DELAY_MS || "100"),
        databasePath: DB_PATH,
      },
      eventBus,
    );
    await pcIndexer.start();
    eventBus.emit("indexer:status", { protocol: "Privacy Cash", status: "complete" });
    pcIndexer.close();
  } catch (err) {
    console.error("❌ Privacy Cash indexer error:", err);
    eventBus.emit("indexer:status", {
      protocol: "Privacy Cash",
      status: "error",
      message: String(err),
    });
  }

  try {
    // SilentSwap
    eventBus.emit("indexer:status", { protocol: "SilentSwap", status: "starting" });
    const ssIndexer = new SilentSwapIndexer(HELIUS_API_KEY, eventBus);
    const { inputs, outputs } = await ssIndexer.fetchAllTransactions(1000);

    if (inputs.length > 0 || outputs.length > 0) {
      const ssDb = new UnveilDatabase(DB_PATH);
      if (inputs.length > 0) ssDb.insertSilentSwapInputs(inputs);
      if (outputs.length > 0) ssDb.insertSilentSwapOutputs(outputs);
      ssDb.close();
    }

    eventBus.emit("indexer:status", {
      protocol: "SilentSwap",
      status: "complete",
      progress: `${inputs.length} inputs, ${outputs.length} outputs`,
    });
  } catch (err) {
    console.error("❌ SilentSwap indexer error:", err);
    eventBus.emit("indexer:status", {
      protocol: "SilentSwap",
      status: "error",
      message: String(err),
    });
  }

  try {
    // ShadowWire
    eventBus.emit("indexer:status", { protocol: "ShadowWire", status: "starting" });
    const swIndexer = new ShadowWireIndexer(HELIUS_API_KEY, eventBus);
    const transfers = await swIndexer.fetchTransfers(1000);

    if (transfers.length > 0) {
      const swDb = new UnveilDatabase(DB_PATH);
      swDb.insertShadowWireTransfers(transfers);

      const accounts = await swIndexer.aggregateAccounts(transfers);
      for (const account of accounts.values()) {
        swDb.upsertShadowWireAccount(account);
      }
      swDb.close();
    }

    eventBus.emit("indexer:status", {
      protocol: "ShadowWire",
      status: "complete",
      progress: `${transfers.length} transfers`,
    });
  } catch (err) {
    console.error("❌ ShadowWire indexer error:", err);
    eventBus.emit("indexer:status", {
      protocol: "ShadowWire",
      status: "error",
      message: String(err),
    });
  }

  console.log("\n✅ All indexers complete. Server continues running.");
  console.log("📊 Dashboard: http://localhost:3001");
  console.log("   Press Ctrl+C to stop.\n");

  // 7. Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down...");
    server.close();
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
