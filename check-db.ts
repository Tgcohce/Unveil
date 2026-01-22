/**
 * Check database content
 */

import Database from "better-sqlite3";

const db = new Database("./data/unveil_working.db");

console.log("=== ShadowWire Database Stats ===\n");

const totalTransfers = db
  .prepare("SELECT COUNT(*) as count FROM shadowwire_transfers")
  .get() as { count: number };
console.log(`Total transfers: ${totalTransfers.count}`);

const uniqueSenders = db
  .prepare("SELECT COUNT(DISTINCT sender) as count FROM shadowwire_transfers")
  .get() as { count: number };
console.log(`Unique senders: ${uniqueSenders.count}`);

const uniqueRecipients = db
  .prepare(
    "SELECT COUNT(DISTINCT recipient) as count FROM shadowwire_transfers",
  )
  .get() as { count: number };
console.log(`Unique recipients: ${uniqueRecipients.count}`);

console.log("\n=== Top 5 Most Active Addresses ===");
const topAddresses = db
  .prepare(
    `SELECT sender, COUNT(*) as tx_count 
     FROM shadowwire_transfers 
     GROUP BY sender 
     ORDER BY tx_count DESC 
     LIMIT 5`,
  )
  .all() as Array<{ sender: string; tx_count: number }>;

topAddresses.forEach((addr, idx) => {
  console.log(
    `${idx + 1}. ${addr.sender.slice(0, 12)}... - ${addr.tx_count} transactions`,
  );
});

console.log("\n=== Sample Transfers ===");
const sampleTransfers = db
  .prepare(
    `SELECT signature, sender, recipient, timestamp, transfer_type 
     FROM shadowwire_transfers 
     ORDER BY timestamp DESC 
     LIMIT 3`,
  )
  .all() as Array<{
  signature: string;
  sender: string;
  recipient: string;
  timestamp: number;
  transfer_type: string;
}>;

sampleTransfers.forEach((t, idx) => {
  console.log(`\n${idx + 1}. ${t.signature.slice(0, 16)}...`);
  console.log(`   Time: ${new Date(t.timestamp).toISOString()}`);
  console.log(`   From: ${t.sender.slice(0, 16)}...`);
  console.log(`   To:   ${t.recipient.slice(0, 16)}...`);
  console.log(`   Type: ${t.transfer_type}`);
});

db.close();
