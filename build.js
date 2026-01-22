#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

console.log("Building UNVEIL Dashboard...");
console.log("============================");

const dashboardDir = path.join(__dirname, "src", "dashboard");

try {
  console.log("Installing dependencies...");
  execSync("npm install", {
    cwd: dashboardDir,
    stdio: "inherit",
  });

  console.log("\nBuilding...");
  execSync("npm run build", {
    cwd: dashboardDir,
    stdio: "inherit",
  });

  console.log("\n✅ Build complete!");
  console.log("Output directory: src/dashboard/dist");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
