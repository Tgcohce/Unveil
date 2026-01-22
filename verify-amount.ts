import { Connection, PublicKey } from "@solana/web3.js";
import Database from "better-sqlite3";

const HELIUS_RPC = process.env.HELIUS_RPC_URL || "";
const connection = new Connection(HELIUS_RPC);

async function verifyTransaction(signature: string) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Verifying transaction: ${signature}`);
  console.log("=".repeat(80));

  // Get from database
  const db = new Database("./data/unveil_working.db");
  const row = db
    .prepare("SELECT * FROM shadowwire_transfers WHERE signature = ?")
    .get(signature) as any;

  console.log("\n📊 DATABASE RECORD:");
  console.log(`  Amount stored: ${row.amount}`);
  console.log(`  Token: ${row.token}`);
  console.log(`  Type: ${row.transfer_type}`);
  console.log(`  From: ${row.sender}`);
  console.log(`  To: ${row.recipient}`);

  // Fetch actual transaction
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || !tx.meta) {
    console.log("❌ Transaction not found or has no metadata");
    db.close();
    return;
  }

  console.log("\n🔍 ACTUAL TRANSACTION DATA:");
  console.log(`  Success: ${!tx.meta.err}`);
  console.log(
    `  Block time: ${new Date((tx.blockTime || 0) * 1000).toISOString()}`,
  );

  // Show balance changes
  const accountKeys = tx.transaction.message.accountKeys;
  const preBalances = tx.meta.preBalances;
  const postBalances = tx.meta.postBalances;

  console.log("\n💰 SOL BALANCE CHANGES:");
  accountKeys.forEach((key, idx) => {
    const change = postBalances[idx] - preBalances[idx];
    if (change !== 0) {
      const changeSOL = change / 1e9;
      console.log(
        `  ${key.pubkey.toString().slice(0, 30)}...: ${changeSOL > 0 ? "+" : ""}${changeSOL.toFixed(9)} SOL`,
      );
    }
  });

  // Show token balance changes
  const preTokenBalances = tx.meta.preTokenBalances || [];
  const postTokenBalances = tx.meta.postTokenBalances || [];

  if (preTokenBalances.length > 0 || postTokenBalances.length > 0) {
    console.log("\n🪙 TOKEN BALANCE CHANGES:");

    preTokenBalances.forEach((pre) => {
      const post = postTokenBalances.find(
        (p) => p.accountIndex === pre.accountIndex,
      );
      if (post) {
        const mint = pre.mint;
        const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || "0");
        const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || "0");
        const change = postAmount - preAmount;

        console.log(`  Mint: ${mint.slice(0, 30)}...`);
        console.log(
          `    Change: ${change > 0 ? "+" : ""}${change} (${pre.uiTokenAmount.decimals} decimals)`,
        );
        console.log(`    Pre:  ${preAmount}`);
        console.log(`    Post: ${postAmount}`);
      }
    });
  }

  // Show log messages
  console.log("\n📝 LOG MESSAGES:");
  const logs = tx.meta.logMessages || [];
  logs.forEach((log) => {
    if (
      log.includes("Instruction:") ||
      log.includes("Transfer") ||
      log.includes("Program GQBq")
    ) {
      console.log(`  ${log}`);
    }
  });

  console.log("\n🔗 View on Solscan:");
  console.log(`  https://solscan.io/tx/${signature}`);

  db.close();
}

// Verify the transactions passed as arguments
const signatures = process.argv.slice(2);
if (signatures.length === 0) {
  console.log("Usage: npx tsx verify-amount.ts <signature1> [signature2] ...");
  process.exit(1);
}

(async () => {
  for (const sig of signatures) {
    await verifyTransaction(sig);
  }
})();
