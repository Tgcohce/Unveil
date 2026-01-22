/**
 * Test script to verify withdrawal insertion works with duplicate nullifiers
 */

import { UnveilDatabase } from "./src/indexer/db";
import { Withdrawal } from "./src/indexer/types";

const TEST_DB = "./data/test_withdrawals.db";

console.log("Testing withdrawal insertion with duplicate nullifiers...\n");

// Create fresh database
const db = new UnveilDatabase(TEST_DB);

// Create 5 test withdrawals with same nullifier (mimics Privacy Cash)
const testWithdrawals: Withdrawal[] = [
  {
    signature: "test-sig-1",
    timestamp: Date.now(),
    slot: 1000,
    amount: 1_000_000_000, // 1 SOL
    recipient: "recipient-1",
    nullifier: "unknown", // Same for all!
    relayer: "relayer-1",
    fee: 5_000_000,
  },
  {
    signature: "test-sig-2",
    timestamp: Date.now() + 1000,
    slot: 1001,
    amount: 2_000_000_000, // 2 SOL
    recipient: "recipient-2",
    nullifier: "unknown", // Same for all!
    relayer: "relayer-2",
    fee: 5_000_000,
  },
  {
    signature: "test-sig-3",
    timestamp: Date.now() + 2000,
    slot: 1002,
    amount: 3_000_000_000, // 3 SOL
    recipient: "recipient-3",
    nullifier: "unknown", // Same for all!
    relayer: "relayer-3",
    fee: 5_000_000,
  },
  {
    signature: "test-sig-4",
    timestamp: Date.now() + 3000,
    slot: 1003,
    amount: 4_000_000_000, // 4 SOL
    recipient: "recipient-4",
    nullifier: "unknown", // Same for all!
    relayer: "relayer-4",
    fee: 5_000_000,
  },
  {
    signature: "test-sig-5",
    timestamp: Date.now() + 4000,
    slot: 1004,
    amount: 5_000_000_000, // 5 SOL
    recipient: "recipient-5",
    nullifier: "unknown", // Same for all!
    relayer: "relayer-5",
    fee: 5_000_000,
  },
];

// Insert withdrawals
console.log("Inserting 5 withdrawals with duplicate nullifiers...");
for (const withdrawal of testWithdrawals) {
  try {
    db.insertWithdrawal(withdrawal);
    console.log(`✓ Inserted: ${withdrawal.signature}`);
  } catch (error) {
    console.error(`✗ Failed to insert ${withdrawal.signature}:`, error);
  }
}

// Check count
const stats = db.getStats();
console.log("\n=== Results ===");
console.log(`Total withdrawals in DB: ${stats.totalWithdrawals}`);
console.log(`Expected: 5`);
console.log(`Status: ${stats.totalWithdrawals === 5 ? "✅ PASS" : "❌ FAIL"}`);

// Verify all withdrawals are retrievable
console.log("\n=== Verifying Individual Retrievals ===");
for (const withdrawal of testWithdrawals) {
  const retrieved = db.getWithdrawal(withdrawal.signature);
  if (retrieved) {
    console.log(
      `✓ ${withdrawal.signature}: ${retrieved.amount / 1e9} SOL to ${retrieved.recipient}`,
    );
  } else {
    console.error(`✗ ${withdrawal.signature}: NOT FOUND`);
  }
}

db.close();
console.log("\n✅ Test complete! Database saved to:", TEST_DB);
