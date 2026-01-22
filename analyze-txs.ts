/**
 * Test script to fetch and analyze recent Privacy Cash transactions
 */

import { Helius } from "helius-sdk";
import { PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

const helius = new Helius(process.env.HELIUS_API_KEY!);
const PROGRAM_ID = "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";

async function analyzeRecentTransactions() {
  console.log("Fetching recent Privacy Cash transactions...\n");

  const response = await helius.connection.getSignaturesForAddress(
    new PublicKey(PROGRAM_ID),
    { limit: 20 },
  );

  console.log(`Found ${response.length} recent transactions\n`);

  // Fetch details for each
  for (let i = 0; i < Math.min(5, response.length); i++) {
    const sig = response[i].signature;
    console.log(`\n${"=".repeat(80)}`);
    console.log(`Transaction ${i + 1}: ${sig}`);
    console.log(`${"=".repeat(80)}`);

    try {
      const tx = await helius.connection.getParsedTransaction(sig, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) {
        console.log("❌ No transaction data");
        continue;
      }

      const accountKeys = tx.transaction.message.accountKeys.map((k: any) =>
        typeof k === "string" ? k : k.pubkey.toString(),
      );

      console.log(`\nFee Payer: ${accountKeys[0]}`);
      console.log(`Fee: ${tx.meta.fee} lamports`);
      console.log(`\nBalance Changes:`);

      const balanceChanges: any[] = [];
      for (let j = 0; j < accountKeys.length; j++) {
        const change = tx.meta.postBalances[j] - tx.meta.preBalances[j];
        if (change !== 0) {
          balanceChanges.push({
            address: accountKeys[j],
            change,
            pre: tx.meta.preBalances[j],
            post: tx.meta.postBalances[j],
          });

          const type = change > 0 ? "📈 GAIN" : "📉 LOSS";
          const sol = (Math.abs(change) / 1e9).toFixed(6);
          console.log(
            `  ${type} ${accountKeys[j]}: ${change > 0 ? "+" : ""}${sol} SOL`,
          );
        }
      }

      // Analyze pattern
      const THRESHOLD = 10_000_000; // 0.01 SOL
      const largestGain = balanceChanges
        .filter((b) => b.change > THRESHOLD)
        .sort((a, b) => b.change - a.change)[0];

      const largestLoss = balanceChanges
        .filter((b) => b.change < -THRESHOLD)
        .sort((a, b) => a.change - b.change)[0];

      console.log(`\nAnalysis:`);
      if (largestGain) {
        const sol = (largestGain.change / 1e9).toFixed(6);
        console.log(`  Largest Gain: ${sol} SOL to ${largestGain.address}`);
        if (largestGain.address !== accountKeys[0]) {
          console.log(
            `  ✅ LOOKS LIKE WITHDRAWAL (someone other than fee payer gained SOL)`,
          );
        }
      }

      if (largestLoss) {
        const sol = (Math.abs(largestLoss.change) / 1e9).toFixed(6);
        console.log(`  Largest Loss: ${sol} SOL from ${largestLoss.address}`);
        if (largestLoss.address === accountKeys[0]) {
          console.log(`  ✅ LOOKS LIKE DEPOSIT (fee payer lost SOL)`);
        }
      }

      // Wait a bit to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

analyzeRecentTransactions().catch(console.error);
