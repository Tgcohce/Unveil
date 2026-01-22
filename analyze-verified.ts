/**
 * Run privacy analysis on verified clean database
 */

import dotenv from "dotenv";

// Set database to our verified clean data
process.env.DATABASE_PATH = "./data/unveil_verified_1768489511035.db";
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
