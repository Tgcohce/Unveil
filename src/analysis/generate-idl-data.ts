/**
 * Generate IDL Security Analysis Data for Dashboard
 *
 * Run: npx tsx src/analysis/generate-idl-data.ts
 */

import * as fs from "fs";
import * as path from "path";
import { analyzeShadowWire, getProtocolComparisons } from "./idl-security";

function main() {
  console.log("Generating IDL Security Analysis Data...\n");

  // Analyze ShadowWire
  const shadowWireAnalysis = analyzeShadowWire();

  console.log("=".repeat(60));
  console.log("SHADOWWIRE IDL SECURITY ANALYSIS");
  console.log("=".repeat(60));
  console.log(`\nSecurity Score: ${shadowWireAnalysis.securityScore}/100`);
  console.log(`\nIssue Summary:`);
  console.log(`  CRITICAL: ${shadowWireAnalysis.criticalCount}`);
  console.log(`  HIGH: ${shadowWireAnalysis.highCount}`);
  console.log(`  MEDIUM: ${shadowWireAnalysis.mediumCount}`);
  console.log(`  LOW: ${shadowWireAnalysis.lowCount}`);

  console.log(`\nFlags:`);
  console.log(`  Has Admin Backdoor: ${shadowWireAnalysis.hasAdminBackdoor ? "YES ❌" : "NO ✅"}`);
  console.log(`  Proper Authorization: ${shadowWireAnalysis.hasProperAuthorization ? "YES ✅" : "NO ❌"}`);
  console.log(`  Has Account Constraints: ${shadowWireAnalysis.hasAccountConstraints ? "YES ✅" : "NO ❌"}`);
  console.log(`  Fake ZK Claims: ${shadowWireAnalysis.hasFakeZKClaims ? "YES ❌" : "NO ✅"}`);
  console.log(`  Centralized: ${shadowWireAnalysis.isCentralized ? "YES ❌" : "NO ✅"}`);
  console.log(`  Production Ready: ${shadowWireAnalysis.isProductionReady ? "YES ✅" : "NO ❌"}`);

  console.log(`\nDetailed Issues:`);
  for (const issue of shadowWireAnalysis.issues) {
    const emoji = issue.severity === "CRITICAL" ? "🔴" :
                  issue.severity === "HIGH" ? "🟠" :
                  issue.severity === "MEDIUM" ? "🟡" : "🔵";
    console.log(`\n  ${emoji} [${issue.severity}] ${issue.title}`);
    console.log(`     Category: ${issue.category}`);
    console.log(`     ${issue.description}`);
    if (issue.instruction) {
      console.log(`     Instruction: ${issue.instruction}`);
    }
    console.log(`     Recommendation: ${issue.recommendation}`);
  }

  console.log(`\nRecommendations:`);
  for (const rec of shadowWireAnalysis.recommendations) {
    console.log(`  💡 ${rec}`);
  }

  // Get protocol comparisons
  const comparisons = getProtocolComparisons();

  console.log("\n" + "=".repeat(60));
  console.log("PROTOCOL IDL SECURITY COMPARISON");
  console.log("=".repeat(60));
  console.log("\n| Protocol | IDL Score | Admin Backdoor | User Signs | ZK Proofs | Verdict |");
  console.log("|----------|-----------|----------------|------------|-----------|---------|");
  for (const p of comparisons) {
    const score = p.securityScore >= 0 ? `${p.securityScore}/100` : "N/A";
    const backdoor = p.hasAdminBackdoor ? "❌ YES" : "✅ NO";
    const userSigns = p.userSignsTransfers ? "✅ YES" : "❌ NO";
    const zkProofs = p.hasProofVerification ? "✅ YES" : "❌ NO";
    const verdict = p.verdict === "SAFE" ? "✅ SAFE" :
                   p.verdict === "CAUTION" ? "⚠️ CAUTION" :
                   p.verdict === "DANGER" ? "🔴 DANGER" : "❓ UNKNOWN";
    console.log(`| ${p.protocol.padEnd(16)} | ${score.padEnd(9)} | ${backdoor.padEnd(14)} | ${userSigns.padEnd(10)} | ${zkProofs.padEnd(9)} | ${verdict} |`);
  }

  // Write data to JSON files
  const dataDir = path.join(__dirname, "..", "dashboard", "public", "data");

  // Ensure directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Write ShadowWire IDL analysis
  const idlAnalysisPath = path.join(dataDir, "idl-security-analysis.json");
  fs.writeFileSync(idlAnalysisPath, JSON.stringify({
    shadowwire: shadowWireAnalysis,
    comparisons: comparisons,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(`\n✅ Written to ${idlAnalysisPath}`);

  // Update comparison.json with IDL data
  const comparisonPath = path.join(dataDir, "comparison.json");
  let existingComparison: any = {};
  if (fs.existsSync(comparisonPath)) {
    existingComparison = JSON.parse(fs.readFileSync(comparisonPath, "utf-8"));
  }

  existingComparison.idlSecurity = {
    shadowwire: {
      score: shadowWireAnalysis.securityScore,
      hasAdminBackdoor: shadowWireAnalysis.hasAdminBackdoor,
      hasFakeZK: shadowWireAnalysis.hasFakeZKClaims,
      criticalIssues: shadowWireAnalysis.criticalCount,
      verdict: "DANGER",
    },
    privacyCash: {
      score: -1, // No IDL available
      hasAdminBackdoor: false,
      hasFakeZK: false,
      criticalIssues: 0,
      verdict: "UNKNOWN",
    },
    confidentialTransfers: {
      score: 85,
      hasAdminBackdoor: false,
      hasFakeZK: false,
      criticalIssues: 0,
      verdict: "SAFE",
    },
    silentswap: {
      score: 40,
      hasAdminBackdoor: false,
      hasFakeZK: false,
      criticalIssues: 0,
      verdict: "CAUTION",
    },
  };

  fs.writeFileSync(comparisonPath, JSON.stringify(existingComparison, null, 2));
  console.log(`✅ Updated ${comparisonPath}`);
}

main();
