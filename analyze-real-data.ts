/**
 * Run privacy analysis on our real database
 */

import dotenv from "dotenv";

// Set database to our real data
process.env.DATABASE_PATH = "./data/unveil_real_1768488840834.db";
process.env.PRIVACY_CASH_PROGRAM_ID =
  "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";

// Run the analysis
import("./src/analysis/index")
  .then((module) => {
    module.runAnalysis();
  })
  .catch((error) => {
    console.error("❌ Failed to run analysis:", error);
  });
