/**
 * Run privacy analysis on large verified dataset
 */

import dotenv from "dotenv";

// Set database to our large verified dataset
process.env.DATABASE_PATH = "./data/unveil_large_1768489687265.db";
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
