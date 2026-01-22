/**
 * Analyze both deposit and withdrawal to find amounts
 */

import { Helius } from "helius-sdk";
import { config } from "dotenv";

config();

async function analyzeTransaction(
  helius: Helius,
  signature: string,
  type: string,
) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Analyzing ${type}: ${signature.slice(0, 32)}...`);
  console.log("=".repeat(80));

  const tx = await helius.connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || !tx.meta) {
    console.log("Transaction not found");
    return;
  }

  console.log(
    `\nBlock Time: ${new Date((tx.blockTime || 0) * 1000).toISOString()}`,
  );
  console.log(`Success: ${!tx.meta.err}`);

  // Check log messages
  const logs = tx.meta.logMessages || [];
  const instructionType = logs
    .find((log) => log.includes("Instruction:"))
    ?.split("Instruction:")[1]
    ?.trim();
  console.log(`Instruction Type: ${instructionType}`);

  console.log("\n--- SOL Balance Changes ---");
  const accountKeys = tx.transaction.message.accountKeys || [];
  const preBalances = tx.meta.preBalances || [];
  const postBalances = tx.meta.postBalances || [];

  let maxChange = 0;
  accountKeys.forEach((key, idx) => {
    const change = Math.abs(postBalances[idx] - preBalances[idx]);
    if (change > 5000 && change > maxChange) {
      // Ignore tiny changes (fees)
      maxChange = change;
      console.log(`[${idx}] ${key.pubkey.toString().slice(0, 16)}...`);
      console.log(`      Change: ${(change / 1e9).toFixed(9)} SOL`);
      console.log(
        `      Direction: ${postBalances[idx] > preBalances[idx] ? "RECEIVED" : "SENT"}`,
      );
    }
  });

  console.log("\n--- Token Balance Changes (if any) ---");
  const preTokenBalances = tx.meta.preTokenBalances || [];
  const postTokenBalances = tx.meta.postTokenBalances || [];

  console.log(`Pre-token balances: ${preTokenBalances.length}`);
  console.log(`Post-token balances: ${postTokenBalances.length}`);

  preTokenBalances.forEach((pre) => {
    const post = postTokenBalances.find(
      (p) => p.accountIndex === pre.accountIndex,
    );
    if (post) {
      const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || "0");
      const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || "0");
      const change = postAmount - preAmount;

      if (Math.abs(change) > 0.00001) {
        console.log(`\nToken Account [${pre.accountIndex}]:`);
        console.log(`  Owner: ${pre.owner}`);
        console.log(`  Mint: ${pre.mint}`);
        console.log(`  Change: ${change} tokens`);
      }
    }
  });

  console.log("\n--- Inner Instructions (System Transfers) ---");
  const innerInstructions = tx.meta.innerInstructions || [];
  innerInstructions.forEach((group) => {
    group.instructions.forEach((ix) => {
      if (ix.parsed?.type === "transfer" && ix.parsed.info.lamports) {
        const amount = ix.parsed.info.lamports / 1e9;
        if (amount > 0.00001) {
          // Ignore dust
          console.log(`\n✅ FOUND TRANSFER: ${amount.toFixed(9)} SOL`);
          console.log(`   From: ${ix.parsed.info.source.slice(0, 24)}...`);
          console.log(`   To:   ${ix.parsed.info.destination.slice(0, 24)}...`);
        }
      }
    });
  });
}

async function main() {
  const helius = new Helius(process.env.HELIUS_API_KEY!);

  console.log("🔍 ANALYZING SHADOWWIRE TRANSACTIONS TO EXTRACT AMOUNTS\n");
  console.log("Key question: Can we see the actual transfer amounts?");
  console.log("Expected: YES - because SOL balance changes are public!\n");

  // Analyze a deposit
  await analyzeTransaction(
    helius,
    "4xaJSbsXsCJU7oJrmdM8MBM3FXHMYDNb5WACZ5tXrUr1YmrBnGSPGYdsKv6xvAAq14LTqdEWUvHMWmyw39Du7T49",
    "DEPOSIT",
  );

  // Analyze a withdrawal
  await analyzeTransaction(
    helius,
    "3qojC5xoYGpbZxxwrgLzNDryCRVfhu2j2yAh3gPfUEFSmAwyyZppuqHCbxz7dK28DgQyiVGJRaGvVJnCeqjJCHAq",
    "WITHDRAWAL",
  );

  // Analyze an external transfer
  await analyzeTransaction(
    helius,
    "3GFSc6KTiwD3Ma2hFE3Jiutr4fNxbFsnN9GNyFJCfGmVSeXXXtE3oQt16LMwNTXmQopZs5gw92ph1TiF2eweUbhg",
    "ZK_TRANSFER",
  );

  console.log(`\n\n${"=".repeat(80)}`);
  console.log("CONCLUSION");
  console.log("=".repeat(80));
  console.log(
    "If we can extract amounts from balance changes or inner instructions,",
  );
  console.log(
    "then Bulletproofs are COMPLETELY USELESS - both addresses AND amounts visible!",
  );
}

main().catch(console.error);
