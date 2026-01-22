import Database from "better-sqlite3";

const db = new Database("data/unveil_working.db");

console.log("\n=== VERIFYING CORRECTED DATA ===\n");

// Get sample transactions
const deposits = db
  .prepare(
    `
  SELECT signature, sender, recipient, token, amount, decimals
  FROM shadowwire_transfers
  WHERE amount > 0
  LIMIT 10
`,
  )
  .all() as any[];

const poolAddresses = new Set<string>();

console.log("Sample transactions with amounts:\n");

deposits.forEach((tx) => {
  const isDeposit =
    !tx.sender.startsWith("ApfNmzr") &&
    !tx.sender.startsWith("3hShyAWT") &&
    !tx.sender.startsWith("2nwRTVm") &&
    !tx.sender.startsWith("14kbizF");

  const isWithdrawal =
    tx.sender.startsWith("ApfNmzr") ||
    tx.sender.startsWith("3hShyAWT") ||
    tx.sender.startsWith("2nwRTVm") ||
    tx.sender.startsWith("14kbizF");

  if (isDeposit) {
    poolAddresses.add(tx.recipient);
  } else if (isWithdrawal) {
    poolAddresses.add(tx.sender);
  }

  const txType = isDeposit
    ? "DEPOSIT"
    : isWithdrawal
      ? "WITHDRAWAL"
      : "TRANSFER";
  const symbol =
    tx.token === "SOL"
      ? "SOL"
      : tx.token.includes("DezX")
        ? "BONK"
        : tx.token.includes("God")
          ? "GOD"
          : tx.token.includes("USD1")
            ? "USD1"
            : "TOKEN";

  const amount = tx.amount / Math.pow(10, tx.decimals || 9);

  console.log(`${txType}:`);
  console.log(`  Sig: ${tx.signature.substring(0, 40)}...`);
  console.log(`  From: ${tx.sender.substring(0, 20)}...`);
  console.log(`  To: ${tx.recipient.substring(0, 20)}...`);
  console.log(
    `  Amount: ${amount.toFixed(tx.decimals <= 5 ? 2 : 6)} ${symbol}`,
  );
  console.log();
});

console.log("=== POOL ADDRESSES FOUND ===\n");
poolAddresses.forEach((addr) => {
  console.log(`  ${addr}`);
});

// Stats
const stats = db
  .prepare(
    `
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN amount > 0 THEN 1 ELSE 0 END) as with_amounts,
    COUNT(DISTINCT sender) as unique_senders,
    COUNT(DISTINCT recipient) as unique_recipients
  FROM shadowwire_transfers
`,
  )
  .get() as any;

console.log("\n=== DATABASE STATS ===\n");
console.log(`Total transfers: ${stats.total}`);
console.log(
  `With unmasked amounts: ${stats.with_amounts} (${Math.round((stats.with_amounts / stats.total) * 100)}%)`,
);
console.log(`Unique senders: ${stats.unique_senders}`);
console.log(`Unique recipients: ${stats.unique_recipients}`);

db.close();
