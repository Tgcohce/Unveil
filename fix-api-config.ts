/**
 * Force API to use our clean verified database
 */

import dotenv from "dotenv";
import { execSync } from "child_process";

// Set the correct environment variables
process.env.DATABASE_PATH = "./data/unveil_large_1768489687265.db";
process.env.PRIVACY_CASH_PROGRAM_ID =
  "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";
process.env.PORT = "3002"; // Use different port to avoid conflicts

console.log("🔧 Fixing API Configuration");
console.log("===========================\n");

console.log("Setting environment variables:");
console.log(`DATABASE_PATH: ${process.env.DATABASE_PATH}`);
console.log(`PRIVACY_CASH_PROGRAM_ID: ${process.env.PRIVACY_CASH_PROGRAM_ID}`);
console.log(`PORT: ${process.env.PORT}\n`);

// Create .env file with correct settings
const envContent = `
HELIUS_API_KEY=${process.env.HELIUS_API_KEY || ""}
DATABASE_PATH=${process.env.DATABASE_PATH}
PRIVACY_CASH_PROGRAM_ID=${process.env.PRIVACY_CASH_PROGRAM_ID}
PORT=${process.env.PORT}
`;

require("fs").writeFileSync(".env", envContent.trim());

console.log("✅ Updated .env file with correct database path");
console.log("✅ API will now use verified real data");

// Start API with correct configuration
console.log("\n🚀 Starting API with verified data...");
console.log("📊 Database: ./data/unveil_large_1768489687265.db");
console.log("🌐 Port: 3002");
console.log("🔗 API URL: http://localhost:3002");
console.log("📱 Dashboard will need to connect to this port");

import("./src/api/server")
  .then(() => {
    console.log("\n✅ API started successfully with verified data!");
    console.log("🎯 Frontend should connect to: http://localhost:3002");
  })
  .catch((error) => {
    console.error("❌ Failed to start API:", error);
  });
