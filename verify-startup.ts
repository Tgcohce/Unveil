/**
 * UNVEIL Startup Verification Script
 * Checks all requirements before starting the application
 */

import { existsSync } from "fs";
import { execSync } from "child_process";
import dotenv from "dotenv";
import { UnveilDatabase } from "./src/indexer/db.js";
import { getEnabledProtocols } from "./src/config/protocols.js";

dotenv.config();

async function verify() {
  console.log("🔍 UNVEIL Startup Verification\n");
  console.log("=".repeat(50));

  let allGood = true;

  // Check 1: Database exists
  console.log("\n📊 Database Check");
  const dbPath = process.env.DATABASE_PATH || "./data/unveil.db";
  if (existsSync(dbPath)) {
    console.log(`✅ Database found: ${dbPath}`);

    // Check database content
    try {
      const db = new UnveilDatabase(dbPath);
      const stats = db.getStats();

      console.log(`   - Deposits: ${stats.totalDeposits}`);
      console.log(`   - Withdrawals: ${stats.totalWithdrawals}`);
      console.log(`   - TVL: ${(stats.tvl / 1e9).toFixed(2)} SOL`);
      console.log(`   - Unique Depositors: ${stats.uniqueDepositors}`);

      if (stats.totalDeposits === 0) {
        console.log("⚠️  WARNING: No deposits in database. Run: npm run index");
      }

      db.close();
    } catch (error: any) {
      console.log(`❌ Error reading database: ${error.message}`);
      allGood = false;
    }
  } else {
    console.log(`❌ Database not found: ${dbPath}`);
    console.log("   Run: npm run index");
    allGood = false;
  }

  // Check 2: Helius API Key
  console.log("\n🔑 API Key Check");
  if (
    process.env.HELIUS_API_KEY &&
    process.env.HELIUS_API_KEY !== "your_helius_api_key_here"
  ) {
    console.log("✅ Helius API key configured");
  } else {
    console.log("❌ Helius API key not set");
    console.log("   Edit .env and add your HELIUS_API_KEY");
    allGood = false;
  }

  // Check 3: Node modules
  console.log("\n📦 Dependencies Check");
  if (existsSync("./node_modules")) {
    console.log("✅ Root dependencies installed");
  } else {
    console.log("❌ Root dependencies not installed");
    console.log("   Run: npm install");
    allGood = false;
  }

  if (existsSync("./src/dashboard/node_modules")) {
    console.log("✅ Dashboard dependencies installed");
  } else {
    console.log("❌ Dashboard dependencies not installed");
    console.log("   Run: cd src/dashboard && npm install");
    allGood = false;
  }

  // Check 4: TypeScript compilation
  console.log("\n🔨 Build Check");
  if (existsSync("./dist")) {
    console.log("✅ TypeScript compiled");
  } else {
    console.log("⚠️  TypeScript not compiled (will use tsx runtime)");
  }

  // Check 5: Ports availability
  console.log("\n🌐 Port Check");
  try {
    const netstat = execSync("netstat -ano | findstr :3001", {
      encoding: "utf-8",
    });
    if (netstat.trim()) {
      console.log("⚠️  Port 3001 (dashboard) is in use");
    } else {
      console.log("✅ Port 3001 (dashboard) is available");
    }
  } catch (error) {
    console.log("✅ Port 3001 (dashboard) is available");
  }

  try {
    const netstat = execSync("netstat -ano | findstr :3002", {
      encoding: "utf-8",
    });
    if (netstat.trim()) {
      console.log("⚠️  Port 3002 (API) is in use");
      console.log("   If old server is running, kill it:");
      const lines = netstat.trim().split("\n");
      if (lines.length > 0) {
        const pid = lines[0].split(/\s+/).pop();
        console.log(`   taskkill //F //PID ${pid}`);
      }
    } else {
      console.log("✅ Port 3002 (API) is available");
    }
  } catch (error) {
    console.log("✅ Port 3002 (API) is available");
  }

  // Check 6: Protocol Configuration
  console.log("\n⚙️  Protocol Configuration");
  try {
    const enabled = getEnabledProtocols();

    console.log(`✅ ${enabled.length} protocol(s) enabled:`);
    enabled.forEach((p) => {
      console.log(`   - ${p.name} (${p.id})`);
    });
  } catch (error) {
    console.log("✅ Using default protocol configuration");
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  if (allGood) {
    console.log("\n✅ All checks passed! Ready to start UNVEIL.");
    console.log("\nRun:");
    console.log("  npm run dev     - Start API + Dashboard");
    console.log("  npm run api     - Start API only");
    console.log("  npm run dashboard - Start Dashboard only");
  } else {
    console.log("\n❌ Some checks failed. Please fix the issues above.");
    process.exit(1);
  }

  console.log("\n");
}

verify();
