import Database from "better-sqlite3";

const DB_PATH = process.env.DATABASE_PATH || "./data/unveil_working.db";

console.log(`Adding decimals column to ${DB_PATH}...`);

const db = new Database(DB_PATH);

try {
  // Add decimals column
  db.exec(`
    ALTER TABLE shadowwire_transfers 
    ADD COLUMN decimals INTEGER DEFAULT 9;
  `);

  console.log("✅ Added 'decimals' column successfully");
} catch (err: any) {
  if (err.message.includes("duplicate column name")) {
    console.log("ℹ️  Column 'decimals' already exists, skipping...");
  } else {
    throw err;
  }
}

db.close();
console.log("✅ Migration complete!");
