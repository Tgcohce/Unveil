/**
 * Start API with large dataset
 */

import dotenv from "dotenv";

// Set database to our large verified dataset
process.env.DATABASE_PATH = "./data/unveil_large_1768489687265.db";
process.env.PRIVACY_CASH_PROGRAM_ID =
  "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";

// Start the API server
import("./src/api/server")
  .then(() => {
    console.log("🚀 API started with large verified dataset");
    console.log("📊 Database: ./data/unveil_large_1768489687265.db");
    console.log("🌐 Server running on http://localhost:3000");
    console.log("📱 Dashboard: npm run dashboard");
  })
  .catch((error) => {
    console.error("❌ Failed to start API:", error);
  });
