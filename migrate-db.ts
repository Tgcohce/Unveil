/**
 * Add amount column to existing shadowwire_transfers table
 */

import Database from "better-sqlite3";

const db = new Database("./data/unveil_working.db");

console.log("Adding 'amount' column to shadowwire_transfers table...");

try {
  db.exec(`
    ALTER TABLE shadowwire_transfers 
    ADD COLUMN amount INTEGER;
  `);
  console.log("✅ Column added successfully!");
} catch (error: any) {
  if (error.message.includes("duplicate column name")) {
    console.log("✅ Column already exists!");
  } else {
    console.error("❌ Error:", error.message);
  }
}

db.close();
