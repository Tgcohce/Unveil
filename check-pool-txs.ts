import Database from "better-sqlite3";

const db = new Database("data/unveil_working.db");

// Check transactions with pool as recipient
const poolAddress = "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU";

console.log("\n=== Transactions with ApfNmzr... as recipient ===\n");

const txs = db
  .prepare(
    `
  SELECT signature, sender, recipient, token, amount, decimals
  FROM shadowwire_transfers
  WHERE recipient = ?
  LIMIT 5
`,
  )
  .all(poolAddress);

txs.forEach((tx: any) => {
  console.log(`Signature: ${tx.signature.substring(0, 20)}...`);
  console.log(`Sender: ${tx.sender.substring(0, 20)}...`);
  console.log(`Recipient: ${tx.recipient.substring(0, 20)}...`);
  console.log(`Token: ${tx.token}`);
  console.log(`Amount: ${tx.amount}`);
  console.log(`Decimals: ${tx.decimals}`);
  console.log("---");
});

// Count total
const count = db
  .prepare(
    `
  SELECT COUNT(*) as total
  FROM shadowwire_transfers
  WHERE recipient = ?
`,
  )
  .get(poolAddress) as { total: number };

console.log(`\nTotal transactions: ${count.total}`);

db.close();
