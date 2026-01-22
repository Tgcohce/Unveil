import { UnveilDatabase } from "./src/indexer/db";

const db = new UnveilDatabase("./data/unveil_fresh.db");

const stats = db.getStats();
console.log("Database Statistics:");
console.log("==================");
console.log("Total Deposits:", stats.totalDeposits);
console.log("Total Withdrawals:", stats.totalWithdrawals);
console.log("Unique Depositors:", stats.uniqueDepositors);
console.log("TVL (lamports):", stats.tvl);
console.log("TVL (SOL):", stats.tvl / 1e9);
console.log("Unspent Deposits:", stats.unspentDeposits);

db.close();
