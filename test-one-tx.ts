/**
 * Test script to examine the structure of ONE ShadowWire transaction
 * This helps us understand what data is available and how to parse it
 */

import { Helius } from "helius-sdk";
import { config } from "dotenv";
import { PublicKey } from "@solana/web3.js";

config();

const SHADOWWIRE_PROGRAM_ID = new PublicKey(
  "GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD",
);

const SHADOWWIRE_POOL_PDA = new PublicKey(
  "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU",
);

async function main() {
  const helius = new Helius(process.env.HELIUS_API_KEY!);

  console.log("Fetching recent transactions...\n");

  // Get recent signatures
  const sigs = await helius.connection.getSignaturesForAddress(
    SHADOWWIRE_PROGRAM_ID,
    { limit: 20 },
  );

  console.log(`Found ${sigs.length} recent transactions\n`);

  // Look at multiple transactions to find different instruction types
  for (let i = 0; i < Math.min(5, sigs.length); i++) {
    const firstSig = sigs[i].signature;
    console.log(`\n\n${"=".repeat(80)}`);
    console.log(`=== Transaction ${i + 1}: ${firstSig} ===`);
    console.log("=".repeat(80) + "\n");
    await examineTransaction(helius, firstSig);
  }
}

async function examineTransaction(helius: Helius, firstSig: string) {
  const tx = await helius.connection.getParsedTransaction(firstSig, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    console.log("Transaction not found!");
    return;
  }

  console.log("=== BASIC INFO ===");
  console.log(`Block time: ${tx.blockTime}`);
  console.log(`Slot: ${tx.slot}`);
  console.log(`Success: ${!tx.meta?.err}\n`);

  console.log("=== ACCOUNT KEYS ===");
  const accountKeys = tx.transaction.message.accountKeys || [];
  accountKeys.forEach((key, idx) => {
    console.log(`[${idx}] ${key.pubkey.toString()}`);
    console.log(`     Signer: ${key.signer}, Writable: ${key.writable}`);
  });

  console.log("\n=== INSTRUCTIONS ===");
  const instructions = tx.transaction.message.instructions || [];
  instructions.forEach((ix, idx) => {
    console.log(`\nInstruction ${idx}:`);
    console.log(`  Program: ${ix.programId.toString()}`);
    console.log(`  Accounts: ${JSON.stringify(ix.accounts)}`);
    if (ix.parsed) {
      console.log(`  Parsed: ${JSON.stringify(ix.parsed, null, 2)}`);
    } else {
      console.log(`  Data (hex): ${ix.data}`);
    }
  });

  console.log("\n=== BALANCE CHANGES ===");
  const preBalances = tx.meta?.preBalances || [];
  const postBalances = tx.meta?.postBalances || [];
  accountKeys.forEach((key, idx) => {
    const change = postBalances[idx] - preBalances[idx];
    if (change !== 0) {
      console.log(
        `[${idx}] ${key.pubkey.toString().slice(0, 8)}... : ${change / 1e9} SOL`,
      );
    }
  });

  console.log("\n=== INNER INSTRUCTIONS ===");
  const innerInstructions = tx.meta?.innerInstructions || [];
  console.log(`Found ${innerInstructions.length} inner instruction groups`);
  innerInstructions.forEach((group, idx) => {
    console.log(`\nGroup ${idx} (instruction ${group.index}):`);
    group.instructions.forEach((ix, ixIdx) => {
      console.log(`  Inner ${ixIdx}: ${ix.programId.toString()}`);
      if (ix.parsed) {
        console.log(`    Parsed: ${JSON.stringify(ix.parsed, null, 2)}`);
      }
    });
  });

  console.log("\n=== LOG MESSAGES ===");
  const logs = tx.meta?.logMessages || [];
  logs.forEach((log) => {
    if (log.includes("ShadowWire") || log.includes("Program log")) {
      console.log(`  ${log}`);
    }
  });

  console.log("\n=== FULL TRANSACTION JSON ===");
  console.log(JSON.stringify(tx, null, 2));
}

main().catch(console.error);
