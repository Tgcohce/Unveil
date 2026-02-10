/**
 * Export database data to static JSON files for Vercel deployment.
 * Called by GitHub Actions after indexers run, or manually.
 */

import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { UnveilDatabase } from "./src/indexer/db";
import { TimingCorrelationAttack } from "./src/analysis/timing-attack";
import { ShadowWireAttack } from "./src/analysis/shadowwire-attack";
import { SilentSwapAttack } from "./src/analysis/silentswap-attack";
import { SILENTSWAP_LAUNCH_DATE } from "./src/indexer/types";

const DB_PATH = process.env.DATABASE_PATH || "./data/unveil_working.db";
const OUT_DIR = path.join(__dirname, "src/dashboard/public/data");

function writeJson(filename: string, data: any) {
  const filepath = path.join(OUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  -> ${filename} (${(fs.statSync(filepath).size / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log(`\nExporting data from ${DB_PATH} to ${OUT_DIR}\n`);

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const db = new UnveilDatabase(DB_PATH);
  const timingAttack = new TimingCorrelationAttack();
  const shadowwireAttack = new ShadowWireAttack();
  const silentswapAttack = new SilentSwapAttack();

  // ── Privacy Cash ──
  const deposits = db.getDeposits(100000);
  const withdrawals = db.getWithdrawals(100000);
  const stats = db.getStats();

  writeJson("deposits.json", deposits);
  writeJson("withdrawals.json", withdrawals);
  writeJson("stats.json", stats);

  // Timing attack analysis
  const { results, summary } = timingAttack.analyzeAll(withdrawals, deposits);

  // Privacy Cash privacy score — penalty-based, consistent with ShadowWire/SilentSwap methodology
  // Start at 100 and subtract for each vulnerability discovered
  let pcScore = 100;

  // CRITICAL: Amounts are fully visible on-chain — enables deposit-withdrawal correlation
  pcScore -= 45;

  // Linkability penalty: % of withdrawals with anonymity set < 5 (confirmed deanonymized)
  pcScore -= (summary.attackSuccessRate / 100) * 25;

  // Match coverage penalty: % of withdrawals with at least one timing+amount match
  const matchesWithSources = results.filter((r) => r.likelySources.length > 0).length;
  const matchRate = matchesWithSources / Math.max(summary.totalWithdrawals, 1);
  pcScore -= matchRate * 15;

  // Anonymity set penalty
  if (summary.averageAnonymitySet < 50) pcScore -= 10;
  else if (summary.averageAnonymitySet < 100) pcScore -= 5;

  const pcPrivacyScore = Math.max(0, Math.round(pcScore));

  // matches.json — timing attack results (only withdrawals with identified sources)
  writeJson("matches.json", {
    matches: results
      .filter((r) => r.likelySources.length > 0)
      .map((r) => ({
        withdrawal: r.withdrawal,
        likelySources: r.likelySources.slice(0, 3),
        anonymitySet: r.anonymitySet,
        vulnerabilityLevel: r.vulnerabilityLevel,
      })),
    summary,
  });

  // privacy-cash-matches.json — simplified format
  const pcMatches = results
    .filter((r) => r.likelySources.length > 0)
    .map((r) => ({
      type: "timing_amount_correlation",
      depositor: r.likelySources[0]?.deposit.depositor,
      recipient: r.withdrawal.recipient,
      depositSignature: r.likelySources[0]?.deposit.signature,
      withdrawalSignature: r.withdrawal.signature,
      depositAmount: r.likelySources[0]?.deposit.amount,
      withdrawalAmount: r.withdrawal.amount,
      timeDelta: r.likelySources[0]?.timeDelta,
      confidence: r.likelySources[0]?.confidence,
      anonymitySet: r.anonymitySet,
      vulnerabilityLevel: r.vulnerabilityLevel,
    }));
  writeJson("privacy-cash-matches.json", { matches: pcMatches });

  // metrics.json
  writeJson("metrics.json", {
    protocol: "Privacy Cash",
    programId: process.env.PRIVACY_CASH_PROGRAM_ID || "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
    tvl: stats.tvl,
    totalDeposits: stats.totalDeposits,
    totalWithdrawals: stats.totalWithdrawals,
    confirmedDeanonymizations: results.filter((r) => r.vulnerabilityLevel === "critical" || r.vulnerabilityLevel === "high").length,
    linkabilityRate: summary.attackSuccessRate / 100,
    uniqueDepositors: stats.uniqueDepositors,
    avgAnonymitySet: Math.round(summary.averageAnonymitySet * 100) / 100,
    medianAnonymitySet: Math.round(summary.averageAnonymitySet),
    minAnonymitySet: Math.min(...results.map((r) => r.anonymitySet), 0),
    attackMethods: ["Timing correlation", "Amount matching", "Address reuse"],
    privacyScore: pcPrivacyScore,
    lastUpdated: new Date().toISOString(),
  });

  // ── ShadowWire ──
  const swTransfers = db.getShadowWireTransfers(10000);
  const swAccountsArray = db.getShadowWireAccounts();
  const swAccounts = new Map(swAccountsArray.map((a) => [a.wallet, a]));

  writeJson("shadowwire-transfers.json", { transfers: swTransfers });

  let swPrivacyScore = 47;
  let swLinkabilityRate = 0;
  let swVisibleLinks = 0;
  const swMatchesOut: any[] = [];

  if (swTransfers.length > 0) {
    const swAnalysis = shadowwireAttack.analyze(swTransfers, swAccounts);
    swPrivacyScore = swAnalysis.privacyScore;
    swLinkabilityRate = swAnalysis.linkabilityRate / 100;
    swVisibleLinks = swAnalysis.linkableTransfers;

    for (const m of swAnalysis.matches) {
      swMatchesOut.push({
        type: "visible_address_link",
        sender: m.sender,
        recipient: m.recipient,
        signature: m.signature,
        timestamp: m.timestamp,
        confidence: m.confidence,
        reason: m.matchReason.join("; "),
      });
    }

    writeJson("shadowwire-analysis.json", {
      protocol: "ShadowWire",
      programId: "GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD",
      privacyScore: swPrivacyScore,
      totalTransfers: swAnalysis.totalTransfers,
      visibleAddressLinks: swVisibleLinks,
      linkabilityRate: swLinkabilityRate,
      analysisMethod: "Direct on-chain inspection - addresses are plaintext visible",
      attackType: "No attack needed - addresses visible",
      findings: [
        `${swVisibleLinks} transfers have BOTH sender AND recipient addresses visible on-chain`,
        "Bulletproofs successfully hide amounts but provide zero address privacy",
        "Transaction graph is fully analyzable",
        `${(swLinkabilityRate * 100).toFixed(1)}% of transfers have partial or full address exposure`,
      ],
      vulnerabilities: swAnalysis.vulnerabilities,
      recommendations: swAnalysis.recommendations,
      visibleTransferLinks: swVisibleLinks,
      analysisTimestamp: new Date().toISOString(),
    });
  }

  writeJson("shadowwire-matches.json", { matches: swMatchesOut });

  // ── SilentSwap ──
  // Filter: only post-launch transactions and exclude dust/test amounts (< 0.01 SOL)
  // All real SilentSwap swaps are ≥ 0.05 SOL; amounts below 0.01 SOL are test pings
  const DUST_THRESHOLD = 10_000_000; // 0.01 SOL in lamports
  const ssInputs = db.getSilentSwapInputsByTimeRange(SILENTSWAP_LAUNCH_DATE, Date.now())
    .filter(i => i.amount >= DUST_THRESHOLD);
  const ssOutputs = db.getSilentSwapOutputsByTimeRange(SILENTSWAP_LAUNCH_DATE, Date.now())
    .filter(o => o.amount >= DUST_THRESHOLD);
  console.log(`  SilentSwap: ${ssInputs.length} inputs, ${ssOutputs.length} outputs (post-launch, non-dust)`);

  let ssPrivacyScore = 67;
  let ssLinkabilityRate = 0;
  let ssConfirmedMatches = 0;
  const ssMatchesOut: any[] = [];

  if (ssInputs.length > 0 || ssOutputs.length > 0) {
    const ssAnalysis = silentswapAttack.analyze(ssInputs, ssOutputs);
    ssPrivacyScore = ssAnalysis.privacyScore;
    ssLinkabilityRate = ssAnalysis.linkabilityRate / 100;
    ssConfirmedMatches = ssAnalysis.matchedPairs;

    for (const m of ssAnalysis.matches) {
      ssMatchesOut.push({
        type: m.matchReasons.some((r: string) => r.includes("Round-trip")) ? "round_trip_wallet" : "timing_amount_correlation",
        wallet: m.input?.userWallet || m.output?.destinationWallet,
        inputSignature: m.input?.signature,
        outputSignature: m.output?.signature,
        inputAmount: m.input?.amount,
        outputAmount: m.output?.amount,
        confidence: m.confidence,
        reason: m.matchReasons.join("; "),
      });
    }

    writeJson("silentswap-analysis.json", {
      protocol: "SilentSwap",
      relayAddress: "CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr",
      privacyScore: ssPrivacyScore,
      totalInputs: ssAnalysis.totalInputs,
      totalOutputs: ssAnalysis.totalOutputs,
      confirmedMatches: ssConfirmedMatches,
      linkabilityRate: ssLinkabilityRate,
      analysisMethod: "Round-trip wallet detection - wallets appearing as both input source and output destination",
      attackType: "Wallet graph analysis",
      findings: [
        `${ssConfirmedMatches} wallets identified that BOTH sent to AND received from SilentSwap`,
        "These round-trip users have their privacy compromised",
        "Cross-chain routing prevents timing+amount correlation",
        `${((1 - ssLinkabilityRate) * 100).toFixed(1)}% of inputs remain unlinked`,
      ],
      vulnerabilities: ssAnalysis.vulnerabilities,
      recommendations: ssAnalysis.recommendations,
      analysisTimestamp: new Date().toISOString(),
    });
  }

  writeJson("silentswap-matches.json", { matches: ssMatchesOut });

  // ── Comparison ──
  writeJson("comparison.json", {
    privacyCash: {
      protocol: "Privacy Cash",
      privacyScore: pcPrivacyScore,
      totalDeposits: stats.totalDeposits,
      totalWithdrawals: stats.totalWithdrawals,
      confirmedDeanonymizations: results.filter((r) => r.vulnerabilityLevel === "critical" || r.vulnerabilityLevel === "high").length,
      linkabilityRate: summary.attackSuccessRate / 100,
      avgAnonymitySet: Math.round(summary.averageAnonymitySet * 100) / 100,
      hidesAmounts: false,
      hidesAddresses: true,
      usesZKProofs: true,
      zkProofType: "Groth16",
      attackMethods: [
        `Timing + Amount correlation (${pcMatches.length} matches)`,
        `Address reuse (${results.filter((r) => r.anonymitySet === 1).length} matches)`,
      ],
      keyVulnerability: `Amounts visible on-chain enable correlation attacks. ${(summary.attackSuccessRate).toFixed(1)}% of withdrawals linked to deposits.`,
    },
    shadowWire: {
      protocol: "ShadowWire",
      privacyScore: swPrivacyScore,
      totalTransfers: swTransfers.length,
      visibleAddressLinks: swVisibleLinks,
      linkabilityRate: swLinkabilityRate,
      hidesAmounts: true,
      hidesAddresses: false,
      usesZKProofs: true,
      zkProofType: "Bulletproofs",
      attackMethods: ["Direct on-chain address visibility"],
      keyVulnerability: `Bulletproofs hide amounts but addresses are plaintext visible. ${(swLinkabilityRate * 100).toFixed(1)}% have both sender and recipient exposed.`,
    },
    silentSwap: {
      protocol: "SilentSwap",
      privacyScore: ssPrivacyScore,
      totalInputs: ssInputs.length,
      totalOutputs: ssOutputs.length,
      confirmedDeanonymizations: ssConfirmedMatches,
      linkabilityRate: ssLinkabilityRate,
      hidesAmounts: false,
      hidesAddresses: true,
      usesZKProofs: false,
      zkProofType: "Cross-chain (Secret Network)",
      attackMethods: [`Round-trip wallet exposure (${ssConfirmedMatches} wallets)`],
      keyVulnerability: `Wallets that both send and receive through SilentSwap are linkable. ${(ssLinkabilityRate * 100).toFixed(1)}% exposure rate.`,
    },
    summary: {
      winner: [
        { name: "Privacy Cash", score: pcPrivacyScore },
        { name: "ShadowWire", score: swPrivacyScore },
        { name: "SilentSwap", score: ssPrivacyScore },
      ].sort((a, b) => b.score - a.score)[0].name,
      totalDeanonymizations: {
        privacyCash: results.filter((r) => r.vulnerabilityLevel === "critical" || r.vulnerabilityLevel === "high").length,
        shadowWire: swVisibleLinks,
        silentSwap: ssConfirmedMatches,
      },
      recommendation: `SilentSwap provides the best privacy (${ssPrivacyScore} score, ${(ssLinkabilityRate * 100).toFixed(1)}% linkable) via cross-chain routing. Privacy Cash (${pcPrivacyScore} score, ${(summary.attackSuccessRate).toFixed(1)}% linkable) and ShadowWire (${swPrivacyScore} score, ${(swLinkabilityRate * 100).toFixed(1)}% linkable) both have significant vulnerabilities.`,
      methodology: "Analysis based on on-chain data. Privacy Cash attacked via timing+amount correlation. ShadowWire addresses directly visible. SilentSwap attacked via round-trip wallet detection.",
    },
  });

  // ── Metadata ──
  writeJson("metadata.json", {
    lastUpdated: new Date().toISOString(),
    version: "1.0.0",
    protocols: {
      privacyCash: { deposits: stats.totalDeposits, withdrawals: stats.totalWithdrawals },
      shadowWire: { transfers: swTransfers.length },
      silentSwap: { inputs: ssInputs.length, outputs: ssOutputs.length },
    },
  });

  db.close();
  console.log("\nExport complete!");
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
