/**
 * Test the updated ShadowWire parser
 */

import { config } from "dotenv";
import { ShadowWireIndexer } from "./src/indexer/shadowwire";

config();

async function main() {
  console.log("Testing ShadowWire parser with recent transactions...\n");

  const indexer = new ShadowWireIndexer(process.env.HELIUS_API_KEY!);

  // Fetch a small batch to test
  const transfers = await indexer.fetchTransfers(20);

  console.log(`\n=== RESULTS ===`);
  console.log(`Total signatures fetched: 20`);
  console.log(`Transfers parsed: ${transfers.length}`);
  console.log(`Parse rate: ${((transfers.length / 20) * 100).toFixed(1)}%\n`);

  if (transfers.length > 0) {
    console.log("Sample transfers:");
    transfers.slice(0, 5).forEach((t, idx) => {
      console.log(`\n[${idx + 1}] ${t.signature.slice(0, 16)}...`);
      console.log(`  Time: ${new Date(t.timestamp).toISOString()}`);
      console.log(`  Type: ${t.transferType}`);
      console.log(`  From: ${t.sender.slice(0, 12)}...`);
      console.log(`  To:   ${t.recipient.slice(0, 12)}...`);
      console.log(`  Amount hidden: ${t.amountHidden}`);
    });
  } else {
    console.log("❌ No transfers parsed! Check the parser logic.");
  }
}

main().catch(console.error);
