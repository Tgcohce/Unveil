import Database from "better-sqlite3";
import axios from "axios";

const db = new Database("data/unveil_working.db");
const HELIUS_RPC_URL =
  process.env.HELIUS_RPC_URL ||
  "https://mainnet.helius-rpc.com/?api-key=89e99b79-64c6-44e4-b298-90510b35a5b4";

// Get a few transactions from database
const txs = db
  .prepare(
    `
  SELECT signature, sender, recipient, token, amount, decimals
  FROM shadowwire_transfers
  WHERE amount IS NOT NULL AND amount > 0
  LIMIT 5
`,
  )
  .all() as any[];

console.log("=== VERIFYING DATABASE DATA AGAINST BLOCKCHAIN ===\n");

async function verifyTransaction(tx: any) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Signature: ${tx.signature}`);
  console.log(`\nDATABASE DATA:`);
  console.log(`  Sender: ${tx.sender}`);
  console.log(`  Recipient: ${tx.recipient}`);
  console.log(`  Token: ${tx.token}`);
  console.log(`  Amount (raw): ${tx.amount}`);
  console.log(`  Decimals: ${tx.decimals}`);
  console.log(
    `  Amount (formatted): ${tx.amount / Math.pow(10, tx.decimals || 9)}`,
  );

  try {
    const response = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [
        tx.signature,
        {
          encoding: "jsonParsed",
          maxSupportedTransactionVersion: 0,
        },
      ],
    });

    const txData = response.data.result;

    console.log(`\nBLOCKCHAIN DATA:`);
    console.log(`  Slot: ${txData.slot}`);

    // Show account keys
    const accountKeys = txData.transaction.message.accountKeys || [];
    console.log(`\n  Account Keys:`);
    accountKeys.slice(0, 5).forEach((key: any, idx: number) => {
      console.log(`    [${idx}] ${key.pubkey}`);
    });

    // Show balance changes
    const preBalances = txData.meta.preBalances || [];
    const postBalances = txData.meta.postBalances || [];
    console.log(`\n  SOL Balance Changes:`);
    accountKeys.forEach((key: any, idx: number) => {
      const change = postBalances[idx] - preBalances[idx];
      if (change !== 0) {
        console.log(
          `    [${idx}] ${key.pubkey.substring(0, 20)}... : ${change / 1e9} SOL`,
        );
      }
    });

    // Show token balance changes
    const preTokenBalances = txData.meta.preTokenBalances || [];
    const postTokenBalances = txData.meta.postTokenBalances || [];

    if (preTokenBalances.length > 0 || postTokenBalances.length > 0) {
      console.log(`\n  Token Balance Changes:`);

      // Group by account index
      const tokenChanges = new Map();

      preTokenBalances.forEach((pre: any) => {
        if (!tokenChanges.has(pre.accountIndex)) {
          tokenChanges.set(pre.accountIndex, { pre, post: null });
        } else {
          tokenChanges.get(pre.accountIndex).pre = pre;
        }
      });

      postTokenBalances.forEach((post: any) => {
        if (!tokenChanges.has(post.accountIndex)) {
          tokenChanges.set(post.accountIndex, { pre: null, post });
        } else {
          tokenChanges.get(post.accountIndex).post = post;
        }
      });

      tokenChanges.forEach((change, accountIndex) => {
        const pre = change.pre;
        const post = change.post;

        if (pre || post) {
          const mint = (pre || post).mint;
          const decimals = (pre || post).uiTokenAmount.decimals;
          const preAmount = pre
            ? parseFloat(pre.uiTokenAmount.uiAmountString || "0")
            : 0;
          const postAmount = post
            ? parseFloat(post.uiTokenAmount.uiAmountString || "0")
            : 0;
          const delta = postAmount - preAmount;

          console.log(
            `    [${accountIndex}] Mint: ${mint.substring(0, 20)}...`,
          );
          console.log(`             Decimals: ${decimals}`);
          console.log(
            `             Pre: ${preAmount}, Post: ${postAmount}, Change: ${delta}`,
          );
          console.log(
            `             Change (raw): ${delta * Math.pow(10, decimals)}`,
          );
        }
      });
    }

    // Show instructions
    console.log(`\n  Instructions:`);
    const instructions = txData.transaction.message.instructions || [];
    instructions.forEach((ix: any, idx: number) => {
      if (ix.programId) {
        console.log(`    [${idx}] Program: ${ix.programId}`);
        if (ix.parsed) {
          console.log(`         Type: ${ix.parsed.type}`);
        }
      }
    });
  } catch (error: any) {
    console.error(`ERROR: ${error.message}`);
  }
}

async function run() {
  for (const tx of txs) {
    await verifyTransaction(tx);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limit
  }

  db.close();
}

run().catch(console.error);
