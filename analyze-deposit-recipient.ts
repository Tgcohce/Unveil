import axios from "axios";

const HELIUS_RPC_URL =
  "https://mainnet.helius-rpc.com/?api-key=89e99b79-64c6-44e4-b298-90510b35a5b4";

async function analyzeTx(sig: string) {
  const response = await axios.post(HELIUS_RPC_URL, {
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: [
      sig,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ],
  });

  const tx = response.data.result;
  const accountKeys = tx.transaction.message.accountKeys;
  const preTokenBalances = tx.meta.preTokenBalances || [];
  const postTokenBalances = tx.meta.postTokenBalances || [];
  const innerInstructions = tx.meta.innerInstructions || [];

  console.log(`\nTransaction: ${sig.substring(0, 40)}...`);
  console.log(`\nAccount Keys:`);
  accountKeys.forEach((key: any, idx: number) => {
    console.log(`  [${idx}] ${key.pubkey}`);
  });

  console.log(`\nToken Balance Changes (with owners):`);
  const changes = new Map();

  preTokenBalances.forEach((pre: any) => {
    changes.set(pre.accountIndex, { pre, post: null });
  });

  postTokenBalances.forEach((post: any) => {
    if (changes.has(post.accountIndex)) {
      changes.get(post.accountIndex).post = post;
    } else {
      changes.set(post.accountIndex, { pre: null, post });
    }
  });

  changes.forEach((change: any, idx: number) => {
    const pre = change.pre;
    const post = change.post;
    const bal = pre || post;
    const preAmount = pre ? parseFloat(pre.uiTokenAmount.uiAmountString) : 0;
    const postAmount = post ? parseFloat(post.uiTokenAmount.uiAmountString) : 0;
    const delta = postAmount - preAmount;

    console.log(`\n  [${idx}] ${accountKeys[idx].pubkey}`);
    console.log(`       Owner: ${bal.owner}`);
    console.log(`       Mint: ${bal.mint.substring(0, 20)}...`);
    console.log(
      `       Change: ${delta} tokens (${delta > 0 ? "GAINED" : "LOST"})`,
    );
  });

  console.log(`\nInner Instructions:`);
  innerInstructions.forEach((inner: any) => {
    inner.instructions.forEach((ix: any) => {
      if (ix.parsed?.type === "transfer") {
        const info = ix.parsed.info;
        console.log(`  Transfer:`);
        console.log(`    From: ${info.source}`);
        console.log(`    To: ${info.destination}`);
        console.log(`    Authority: ${info.authority}`);
        console.log(`    Amount: ${info.amount}`);

        // Find destination owner
        const destIdx = accountKeys.findIndex(
          (k: any) => k.pubkey === info.destination,
        );
        if (destIdx >= 0) {
          const destBal =
            preTokenBalances.find((b: any) => b.accountIndex === destIdx) ||
            postTokenBalances.find((b: any) => b.accountIndex === destIdx);
          if (destBal) {
            console.log(`    Destination Owner (POOL PDA): ${destBal.owner}`);
          }
        }
      }
    });
  });
}

async function run() {
  const txs = [
    "4P7CnizFLhx33fJK5EyoCZQf9u9Sc8mfcg3HPnEoZb6C6MnXjUjbdhvE8tqErcNHBgAHDcnLjRbm7ERZgvrFFfZ2", // GOD
    "xvoiCjFCKqytz85L4fiuF4Fo4CFBTrYrPb858u9GqUfdMeo8Vgd1SYC2rQjRDJnyfv3qxzJdBs9EZ3eTDQnb3Kj", // USD1
  ];

  for (const tx of txs) {
    await analyzeTx(tx);
    console.log("\n" + "=".repeat(80));
  }
}

run().catch(console.error);
