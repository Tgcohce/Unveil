/**
 * Fetch one ShadowWire transaction and analyze balance changes to extract amounts
 */

import { Helius } from "helius-sdk";
import { config } from "dotenv";

config();

async function main() {
  const helius = new Helius(process.env.HELIUS_API_KEY!);

  // Use a recent transaction we know exists
  const signature =
    "4xaJSbsXsCJU7oJrmdM8MBM3FXHMYDNb5WACZ5tXrUr1YmrBnGSPGYdsKv6xvAAq14LTqdEWUvHMWmyw39Du7T49";

  console.log("Fetching transaction to analyze amount extraction...\n");

  const tx = await helius.connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || !tx.meta) {
    console.log("Transaction not found");
    return;
  }

  console.log("=== TRANSACTION DETAILS ===");
  console.log(`Signature: ${signature.slice(0, 32)}...`);
  console.log(
    `Block Time: ${new Date((tx.blockTime || 0) * 1000).toISOString()}`,
  );
  console.log(`Success: ${!tx.meta.err}\n`);

  console.log("=== ACCOUNT KEYS ===");
  const accountKeys = tx.transaction.message.accountKeys || [];
  accountKeys.forEach((key, idx) => {
    console.log(`[${idx}] ${key.pubkey.toString()}`);
    console.log(`     Signer: ${key.signer}, Writable: ${key.writable}`);
  });

  console.log("\n=== BALANCE CHANGES (This reveals the amount!) ===");
  const preBalances = tx.meta.preBalances || [];
  const postBalances = tx.meta.postBalances || [];

  accountKeys.forEach((key, idx) => {
    const pre = preBalances[idx] || 0;
    const post = postBalances[idx] || 0;
    const change = post - pre;

    if (change !== 0) {
      const changeSOL = change / 1e9;
      const direction = change > 0 ? "⬆️ RECEIVED" : "⬇️ SENT";
      console.log(`\n[${idx}] ${key.pubkey.toString().slice(0, 12)}...`);
      console.log(`     ${direction}: ${Math.abs(changeSOL).toFixed(9)} SOL`);
      console.log(`     Pre:  ${(pre / 1e9).toFixed(9)} SOL`);
      console.log(`     Post: ${(post / 1e9).toFixed(9)} SOL`);
    }
  });

  console.log("\n=== EXTRACT TRANSFER AMOUNT ===");
  // The sender loses SOL (negative change)
  // The recipient/pool gains SOL (positive change)
  // The difference reveals the actual amount transferred!

  let senderChange = 0;
  let recipientChange = 0;
  let senderAddress = "";
  let recipientAddress = "";

  accountKeys.forEach((key, idx) => {
    const change = postBalances[idx] - preBalances[idx];
    if (change < 0 && key.signer) {
      // Sender (loses money)
      senderChange = change;
      senderAddress = key.pubkey.toString();
    } else if (change > 0) {
      // Recipient (gains money)
      recipientChange = change;
      recipientAddress = key.pubkey.toString();
    }
  });

  const amountTransferred = Math.abs(recipientChange);
  const fee = Math.abs(senderChange) - amountTransferred;

  console.log(
    `\n✅ UNMASKED AMOUNT: ${(amountTransferred / 1e9).toFixed(9)} SOL`,
  );
  console.log(`   From: ${senderAddress.slice(0, 16)}...`);
  console.log(`   To:   ${recipientAddress.slice(0, 16)}...`);
  console.log(`   Fee:  ${(fee / 1e9).toFixed(9)} SOL`);

  console.log(`\n🔓 PRIVACY BROKEN!`);
  console.log(`   Despite Bulletproofs claiming to hide amounts,`);
  console.log(`   we can see the EXACT amount by looking at balance changes!`);
  console.log(`   This is because SOL balance changes are visible on-chain.`);

  console.log(`\n=== INNER INSTRUCTIONS ===`);
  const innerInstructions = tx.meta.innerInstructions || [];
  innerInstructions.forEach((group, idx) => {
    console.log(`\nGroup ${idx}:`);
    group.instructions.forEach((ix, ixIdx) => {
      if (ix.parsed?.type === "transfer") {
        console.log(
          `  Transfer: ${(ix.parsed.info.lamports / 1e9).toFixed(9)} SOL`,
        );
        console.log(`    From: ${ix.parsed.info.source}`);
        console.log(`    To:   ${ix.parsed.info.destination}`);
      }
    });
  });

  console.log(`\n=== LOG MESSAGES ===`);
  const logs = tx.meta.logMessages || [];
  logs.forEach((log) => {
    if (log.includes("Program log") || log.includes("Instruction")) {
      console.log(`  ${log}`);
    }
  });
}

main().catch(console.error);
