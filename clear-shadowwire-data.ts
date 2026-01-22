import Database from "better-sqlite3";

const db = new Database("data/unveil_working.db");

console.log("Clearing ShadowWire data...");

// Clear shadowwire_transfers table
const countBefore = db
  .prepare("SELECT COUNT(*) as count FROM shadowwire_transfers")
  .get() as { count: number };
console.log(`Records before: ${countBefore.count}`);

db.prepare("DELETE FROM shadowwire_transfers").run();

const countAfter = db
  .prepare("SELECT COUNT(*) as count FROM shadowwire_transfers")
  .get() as { count: number };
console.log(`Records after: ${countAfter.count}`);

db.close();
console.log("✅ Done! Now run: npx tsx index-shadowwire.ts");
