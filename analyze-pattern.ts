import axios from "axios";

const HELIUS_RPC_URL =
  process.env.HELIUS_RPC_URL ||
  "https://mainnet.helius-rpc.com/?api-key=89e99b79-64c6-44e4-b298-90510b35a5b4";

const SAMPLE_TXS = [
  "5aNyM33emuCS6FLu7xdeZhhr55dJj49T1LwpeJPFPKbGcx4Papt8gf5yMS9UYzGVdDhcv7byCp6Yg7kDPqWHdZtu", // BONK deposit
  "m6PeEmGAKaK61Rs6mJb4AvnhJwzUjh3o6NAAte17YCo6ChnPMibJMxWHzXvenMBrK9V8GT4jpb2KNxmWqw7ecp9", // SOL withdrawal
  "5Qs63AWmiM1fsiKwCdnGzfLcYLbjtx33cgtGdYQrfTkyDgXEaPXnRGuxfow4rpmqY9pjXLWea9UP8geQafiJuXEH", // SOL withdrawal
];

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
  const logs = tx.meta.logMessages || [];

  // Find instruction type from logs
  const instructionType =
    logs
      .find((log: string) => log.includes("Instruction:"))
      ?.split("Instruction: ")[1] || "unknown";

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Signature: ${sig.substring(0, 40)}...`);
  console.log(`Instruction: ${instructionType}`);
  console.log(`\nAccount Keys:`);

  accountKeys.forEach((key: any, idx: number) => {
    const signer = key.signer ? " [SIGNER]" : "";
    const writable = key.writable ? " [WRITABLE]" : "";
    console.log(`  [${idx}] ${key.pubkey}${signer}${writable}`);
  });

  // Check for inner instructions (SPL token transfers)
  const innerInstructions = tx.meta.innerInstructions || [];
  if (innerInstructions.length > 0) {
    console.log(`\nInner Instructions (SPL Token Transfers):`);
    innerInstructions.forEach((inner: any) => {
      inner.instructions.forEach((ix: any) => {
        if (ix.parsed?.type === "transfer") {
          const info = ix.parsed.info;
          console.log(`  Transfer:`);
          console.log(
            `    From: ${info.source} (authority: ${info.authority})`,
          );
          console.log(`    To: ${info.destination}`);
          console.log(`    Amount: ${info.amount}`);
        }
      });
    });
  }

  // Show token balance owners
  const preTokenBalances = tx.meta.preTokenBalances || [];
  const postTokenBalances = tx.meta.postTokenBalances || [];

  if (preTokenBalances.length > 0) {
    console.log(`\nToken Account Owners:`);
    preTokenBalances.forEach((bal: any) => {
      console.log(
        `  [${bal.accountIndex}] ${accountKeys[bal.accountIndex].pubkey}`,
      );
      console.log(`       Owner: ${bal.owner}`);
      console.log(`       Mint: ${bal.mint}`);
    });
  }

  // SOL balance changes
  const preBalances = tx.meta.preBalances;
  const postBalances = tx.meta.postBalances;
  console.log(`\nSOL Balance Changes:`);
  accountKeys.forEach((key: any, idx: number) => {
    const change = postBalances[idx] - preBalances[idx];
    if (Math.abs(change) > 1000) {
      // > 0.000001 SOL
      console.log(
        `  [${idx}] ${key.pubkey.substring(0, 20)}... : ${change / 1e9} SOL`,
      );
    }
  });

  // Token balance changes
  if (preTokenBalances.length > 0 || postTokenBalances.length > 0) {
    console.log(`\nToken Balance Changes:`);
    const tokenChanges = new Map();

    preTokenBalances.forEach((pre: any) => {
      tokenChanges.set(pre.accountIndex, { pre, post: null });
    });

    postTokenBalances.forEach((post: any) => {
      if (tokenChanges.has(post.accountIndex)) {
        tokenChanges.get(post.accountIndex).post = post;
      } else {
        tokenChanges.set(post.accountIndex, { pre: null, post });
      }
    });

    tokenChanges.forEach((change: any, accountIndex: number) => {
      const pre = change.pre;
      const post = change.post;
      const bal = pre || post;
      const preAmount = pre ? parseFloat(pre.uiTokenAmount.uiAmountString) : 0;
      const postAmount = post
        ? parseFloat(post.uiTokenAmount.uiAmountString)
        : 0;
      const delta = postAmount - preAmount;

      console.log(
        `  [${accountIndex}] ${accountKeys[accountIndex].pubkey.substring(0, 20)}...`,
      );
      console.log(`       Owner: ${bal.owner}`);
      console.log(`       Change: ${delta} tokens`);
    });
  }
}

async function run() {
  for (const sig of SAMPLE_TXS) {
    await analyzeTx(sig);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

run().catch(console.error);
