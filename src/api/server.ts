/**
 * Express API server for UNVEIL
 * Provides REST endpoints for dashboard
 */

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { UnveilDatabase } from "../indexer/db";
import { PrivacyScorer } from "../analysis/scoring";
import { AnonymitySetCalculator } from "../analysis/anonymity-set";
import { TimingAnalyzer } from "../analysis/timing";
import { AmountAnalyzer } from "../analysis/amounts";
import { TimingCorrelationAttack } from "../analysis/timing-attack";
import { ConfidentialTransferAnalysis } from "../analysis/confidential-analysis";
import { ShadowWireAttack } from "../analysis/shadowwire-attack";
import {
  ProtocolMetrics,
  PrivacyAdvisorRequest,
  PrivacyAdvisorResponse,
} from "../indexer/types";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database and analyzers
const dbPath = process.env.DATABASE_PATH || "./data/unveil.db";
const db = new UnveilDatabase(dbPath);
const scorer = new PrivacyScorer();
const anonymityCalculator = new AnonymitySetCalculator();
const timingAnalyzer = new TimingAnalyzer();
const amountAnalyzer = new AmountAnalyzer();
const timingAttack = new TimingCorrelationAttack();
const confidentialAnalyzer = new ConfidentialTransferAnalysis();
const shadowwireAttack = new ShadowWireAttack();

// Cache for metrics (5 minute TTL)
let metricsCache: { data: ProtocolMetrics | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = parseInt(process.env.CACHE_TTL || "300000"); // 5 minutes

/**
 * GET / - Health check
 */
app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "UNVEIL API",
    version: "1.0.0",
    endpoints: [
      "GET /api/metrics",
      "GET /api/metrics/history",
      "GET /api/transactions",
      "POST /api/advisor",
      "GET /api/stats",
    ],
  });
});

/**
 * GET /api/metrics - Get current protocol metrics
 */
app.get("/api/metrics", async (req: Request, res: Response) => {
  try {
    const now = Date.now();

    // Check cache
    if (metricsCache.data && now - metricsCache.timestamp < CACHE_TTL) {
      return res.json(metricsCache.data);
    }

    // Calculate fresh metrics
    const metrics = await scorer.calculateProtocolMetrics(
      db,
      "Privacy Cash",
      process.env.PRIVACY_CASH_PROGRAM_ID ||
        "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
    );

    // Update cache
    metricsCache = { data: metrics, timestamp: now };

    res.json(metrics);
  } catch (error) {
    console.error("Error calculating metrics:", error);
    res.status(500).json({ error: "Failed to calculate metrics" });
  }
});

/**
 * GET /api/metrics/history - Get time-series metrics
 */
app.get("/api/metrics/history", async (req: Request, res: Response) => {
  try {
    const window = (req.query.window as string) || "24h";

    // Parse window
    const windowMs = parseTimeWindow(window);
    const endTime = Date.now();
    const startTime = endTime - windowMs;

    // Get snapshots
    const snapshots = db.getSnapshots(startTime, endTime);

    res.json({ snapshots });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

/**
 * GET /api/transactions - Get recent transactions
 */
app.get("/api/transactions", (req: Request, res: Response) => {
  try {
    const type = (req.query.type as string) || "all";
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    let transactions: any[] = [];

    if (type === "deposits" || type === "all") {
      const deposits = db.getDeposits(limit, offset);
      transactions.push(...deposits.map((d) => ({ ...d, type: "deposit" })));
    }

    if (type === "withdrawals" || type === "all") {
      const withdrawals = db.getWithdrawals(limit, offset);
      transactions.push(
        ...withdrawals.map((w) => ({ ...w, type: "withdrawal" })),
      );
    }

    // Sort by timestamp
    transactions.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    transactions = transactions.slice(0, limit);

    const stats = db.getStats();
    const total =
      type === "deposits"
        ? stats.totalDeposits
        : type === "withdrawals"
          ? stats.totalWithdrawals
          : stats.totalDeposits + stats.totalWithdrawals;

    res.json({
      transactions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

/**
 * POST /api/advisor - Privacy advisor
 */
app.post("/api/advisor", (req: Request, res: Response) => {
  try {
    const { amount, delayHours } = req.body as PrivacyAdvisorRequest;

    if (!amount || !delayHours) {
      return res
        .status(400)
        .json({ error: "Missing required fields: amount, delayHours" });
    }

    // Get current deposits
    const deposits = db.getUnspentDeposits();

    // Estimate anonymity set
    const estimatedWithdrawalTime = Date.now() + delayHours * 3600 * 1000;
    const estimatedAnonymitySet = anonymityCalculator.estimateAnonymitySet(
      amount,
      estimatedWithdrawalTime,
      deposits,
    );

    // Get recommendations for better amounts
    const allDeposits = db.getDeposits(100000);
    const amountRec = amountAnalyzer.recommendAmounts(amount, allDeposits);

    // Get timing recommendations
    const withdrawals = db.getWithdrawals(100000);
    const pairs = timingAnalyzer.matchDepositWithdrawalPairs(
      allDeposits,
      withdrawals,
    );
    const timingRec = timingAnalyzer.recommendTiming(pairs);

    // Generate recommendation text
    let recommendation = "";
    if (estimatedAnonymitySet < 10) {
      recommendation = "Weak privacy - very few possible sources";
    } else if (estimatedAnonymitySet < 30) {
      recommendation = "Fair privacy - moderate anonymity set";
    } else if (estimatedAnonymitySet < 100) {
      recommendation = "Good privacy - large anonymity set";
    } else {
      recommendation = "Excellent privacy - very large anonymity set";
    }

    const stats = db.getStats();

    const response: PrivacyAdvisorResponse = {
      estimatedAnonymitySet,
      recommendation,
      betterAmounts: amountRec.recommendations.slice(0, 3).map((r) => r.amount),
      betterTiming: timingRec.reasoning,
      currentMetrics: {
        avgAnonymitySet: metricsCache.data?.avgAnonymitySet || 0,
        activeDeposits: stats.unspentDeposits,
        recentActivity: withdrawals.filter(
          (w) => w.timestamp > Date.now() - 24 * 3600 * 1000,
        ).length,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error in advisor:", error);
    res.status(500).json({ error: "Failed to generate advice" });
  }
});

/**
 * GET /api/stats - Get database statistics
 */
app.get("/api/stats", (req: Request, res: Response) => {
  try {
    const stats = db.getStats();
    const indexerState = db.getIndexerState();

    res.json({
      ...stats,
      lastIndexed: indexerState.lastUpdated,
      totalIndexed: indexerState.totalIndexed,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/**
 * GET /api/anonymity-sets - Get anonymity set distribution
 */
app.get("/api/anonymity-sets", (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;

    const deposits = db.getDeposits(100000);
    const withdrawals = db.getWithdrawals(limit);

    const results = anonymityCalculator.calculateAllAnonymitySets(
      withdrawals,
      deposits,
    );
    const statistics = anonymityCalculator.calculateStatistics(results);

    res.json({
      statistics,
      distribution: Array.from(statistics.distribution.entries()).map(
        ([size, count]) => ({
          size,
          count,
        }),
      ),
    });
  } catch (error) {
    console.error("Error calculating anonymity sets:", error);
    res.status(500).json({ error: "Failed to calculate anonymity sets" });
  }
});

/**
 * GET /api/timing-distribution - Get timing distribution
 */
app.get("/api/timing-distribution", (req: Request, res: Response) => {
  try {
    const deposits = db.getDeposits(100000);
    const withdrawals = db.getWithdrawals(100000);

    const pairs = timingAnalyzer.matchDepositWithdrawalPairs(
      deposits,
      withdrawals,
    );
    const distribution = timingAnalyzer.calculateTimingDistribution(pairs);

    res.json({
      mean: distribution.mean,
      median: distribution.median,
      p25: distribution.p25,
      p75: distribution.p75,
      entropy: distribution.entropy,
      buckets: Array.from(distribution.buckets.entries()).map(
        ([bucket, count]) => ({
          hours: bucket,
          count,
        }),
      ),
    });
  } catch (error) {
    console.error("Error calculating timing distribution:", error);
    res.status(500).json({ error: "Failed to calculate timing distribution" });
  }
});

/**
 * GET /api/timing-attack - Timing correlation attack analysis
 */
app.get("/api/timing-attack", (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    const deposits = db.getDeposits(100000);
    const withdrawals = db.getWithdrawals(limit);

    // Perform timing attack analysis
    const { results, summary } = timingAttack.analyzeAll(withdrawals, deposits);

    // Get most vulnerable transactions
    const mostVulnerable = timingAttack.findMostVulnerable(results, 10);

    // Generate recommendations
    const recommendations = timingAttack.generateRecommendations(summary);

    res.json({
      summary,
      mostVulnerable: mostVulnerable.map((v) => ({
        signature: v.withdrawal.signature,
        amount: v.withdrawal.amount,
        timestamp: v.withdrawal.timestamp,
        recipient: v.withdrawal.recipient,
        anonymitySet: v.anonymitySet,
        vulnerabilityLevel: v.vulnerabilityLevel,
        likelySources: v.likelySources.map((s) => ({
          depositSignature: s.deposit.signature,
          depositor: s.deposit.depositor,
          depositAmount: s.deposit.amount,
          depositTimestamp: s.deposit.timestamp,
          confidence: s.confidence,
          timeDelta: s.timeDelta,
          reasoning: s.reasoning,
        })),
      })),
      recommendations,
    });
  } catch (error) {
    console.error("Error performing timing attack:", error);
    res.status(500).json({ error: "Failed to perform timing attack" });
  }
});

/**
 * GET /api/matches - Get all deposit-withdrawal matches with details
 */
app.get("/api/matches", (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const minAnonymitySet = parseInt(req.query.minAnonymitySet as string);
    const maxAnonymitySet = parseInt(req.query.maxAnonymitySet as string);

    const deposits = db.getDeposits(100000);
    const withdrawals = db.getWithdrawals(100000);

    // Perform timing attack to get all matches
    const { results } = timingAttack.analyzeAll(withdrawals, deposits);

    // Filter by anonymity set if specified
    let filtered = results;
    if (!isNaN(minAnonymitySet)) {
      filtered = filtered.filter((r) => r.anonymitySet >= minAnonymitySet);
    }
    if (!isNaN(maxAnonymitySet)) {
      filtered = filtered.filter((r) => r.anonymitySet <= maxAnonymitySet);
    }

    // Sort by anonymity set (most vulnerable first)
    filtered.sort((a, b) => a.anonymitySet - b.anonymitySet);

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);

    const matches = paginated.map((result) => ({
      withdrawal: {
        signature: result.withdrawal.signature,
        amount: result.withdrawal.amount,
        timestamp: result.withdrawal.timestamp,
        recipient: result.withdrawal.recipient,
      },
      anonymitySet: result.anonymitySet,
      vulnerabilityLevel: result.vulnerabilityLevel,
      possibleSources: result.likelySources.map((source) => ({
        deposit: {
          signature: source.deposit.signature,
          amount: source.deposit.amount,
          timestamp: source.deposit.timestamp,
          depositor: source.deposit.depositor,
        },
        confidence: source.confidence,
        timeDelta: source.timeDelta,
        timeDeltaHours: source.timeDelta / (3600 * 1000),
        reasoning: source.reasoning,
      })),
    }));

    res.json({
      matches,
      total: filtered.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

/**
 * Helper: Parse time window string to milliseconds
 */
function parseTimeWindow(window: string): number {
  const match = window.match(/^(\d+)(h|d|w)$/);
  if (!match) {
    return 24 * 3600 * 1000; // Default: 24 hours
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "h":
      return value * 3600 * 1000;
    case "d":
      return value * 24 * 3600 * 1000;
    case "w":
      return value * 7 * 24 * 3600 * 1000;
    default:
      return 24 * 3600 * 1000;
  }
}

// ========== Confidential Transfers Endpoints (Token-2022) ==========

/**
 * GET /api/confidential/stats - Confidential transfers statistics
 */
app.get("/api/confidential/stats", (req: Request, res: Response) => {
  try {
    const stats = db.getConfidentialTransfersStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching confidential transfer stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/**
 * GET /api/confidential/transfers - Get confidential transfers
 */
app.get("/api/confidential/transfers", (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const mint = req.query.mint as string;
    const owner = req.query.owner as string;

    let transfers;
    if (mint) {
      transfers = db.getConfidentialTransfersByMint(mint, limit);
    } else if (owner) {
      transfers = db.getConfidentialTransfersByOwner(owner, limit);
    } else {
      transfers = db.getConfidentialTransfers(limit);
    }

    res.json({
      transfers,
      count: transfers.length,
      limit,
    });
  } catch (error) {
    console.error("Error fetching confidential transfers:", error);
    res.status(500).json({ error: "Failed to fetch transfers" });
  }
});

/**
 * GET /api/confidential/analysis - Privacy analysis of confidential transfers
 */
app.get("/api/confidential/analysis", (req: Request, res: Response) => {
  try {
    const transfers = db.getConfidentialTransfers(10000);

    if (transfers.length === 0) {
      return res.json({
        error: "No confidential transfers indexed yet",
        privacyScore: 0,
        message: "Run 'npx tsx index-confidential.ts' to index Token-2022 data",
      });
    }

    const accountsData = db.getConfidentialAccounts();
    const mintsData = db.getConfidentialMints();

    // Convert arrays to Maps for analysis
    const accounts = new Map(accountsData.map((a) => [a.address, a]));
    const mints = new Map(mintsData.map((m) => [m.address, m]));

    const result = confidentialAnalyzer.analyze(transfers, accounts, mints);

    res.json({
      privacyScore: result.privacyScore,
      metrics: {
        addressReuseRate: result.addressReuseRate,
        avgTxsPerAddress: result.avgTxsPerAddress,
        publicPrivateMixRate: result.publicPrivateMixRate,
        timingEntropy: result.timingEntropy,
        avgTimeBetweenTxs: result.avgTimeBetweenTxs,
        timingClustering: result.timingClustering,
        mintsWithAuditors: result.mintsWithAuditors,
        uniqueAuditors: result.uniqueAuditors,
        auditorCentralization: result.auditorCentralization,
        avgTimeConfidential: result.avgTimeConfidential,
        immediateConversionRate: result.immediateConversionRate,
      },
      vulnerabilities: result.vulnerabilities,
      recommendations: result.recommendations,
      totalTransfers: transfers.length,
      totalAccounts: accounts.size,
      totalMints: mints.size,
    });
  } catch (error) {
    console.error("Error analyzing confidential transfers:", error);
    res.status(500).json({ error: "Failed to analyze transfers" });
  }
});

/**
 * GET /api/confidential/accounts - Get confidential accounts
 */
app.get("/api/confidential/accounts", (req: Request, res: Response) => {
  try {
    const accounts = db.getConfidentialAccounts();

    // Sort by total transactions (most active first)
    accounts.sort((a, b) => b.totalConfidentialTxs - a.totalConfidentialTxs);

    res.json({
      accounts,
      count: accounts.length,
    });
  } catch (error) {
    console.error("Error fetching confidential accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

/**
 * GET /api/confidential/mints - Get confidential mints
 */
app.get("/api/confidential/mints", (req: Request, res: Response) => {
  try {
    const mints = db.getConfidentialMints();

    // Sort by activity (most active first)
    mints.sort((a, b) => b.totalConfidentialTxs - a.totalConfidentialTxs);

    res.json({
      mints,
      count: mints.length,
    });
  } catch (error) {
    console.error("Error fetching confidential mints:", error);
    res.status(500).json({ error: "Failed to fetch mints" });
  }
});

/**
 * GET /api/shadowwire/stats - ShadowWire statistics
 */
app.get("/api/shadowwire/stats", (req: Request, res: Response) => {
  try {
    const stats = db.getShadowWireStats();

    res.json({
      totalTransfers: stats.total_transfers || 0,
      uniqueSenders: stats.unique_senders || 0,
      uniqueRecipients: stats.unique_recipients || 0,
      uniqueTokens: stats.unique_tokens || 0,
      internalTransfers: stats.internal_transfers || 0,
      externalTransfers: stats.external_transfers || 0,
      firstTransfer: stats.first_transfer || null,
      lastTransfer: stats.last_transfer || null,
    });
  } catch (error) {
    console.error("Error fetching ShadowWire stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/**
 * GET /api/shadowwire/transfers - Get ShadowWire transfers
 */
app.get("/api/shadowwire/transfers", (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const address = req.query.address as string;

    let transfers;
    if (address) {
      transfers = db.getShadowWireTransfersByAddress(address, limit);
    } else {
      transfers = db.getShadowWireTransfers(limit);
    }

    res.json({
      transfers,
      count: transfers.length,
    });
  } catch (error) {
    console.error("Error fetching ShadowWire transfers:", error);
    res.status(500).json({ error: "Failed to fetch transfers" });
  }
});

/**
 * GET /api/shadowwire/analysis - Privacy analysis of ShadowWire
 */
app.get("/api/shadowwire/analysis", (req: Request, res: Response) => {
  try {
    const transfers = db.getShadowWireTransfers(10000);
    const accountsArray = db.getShadowWireAccounts();
    const accounts = new Map(accountsArray.map((a) => [a.wallet, a]));

    if (transfers.length === 0) {
      return res.json({
        protocol: "ShadowWire",
        programId: "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU",
        privacyScore: 0,
        message: "No ShadowWire transfers indexed yet",
        totalTransfers: 0,
        linkableTransfers: 0,
        linkabilityRate: 0,
        uniqueUsers: 0,
        addressReuseRate: 0,
        avgTransfersPerAddress: 0,
        timingEntropy: 0,
        avgTimeBetweenTransfers: 0,
        timingClusteringScore: 0,
        avgAnonymitySet: 0,
        medianAnonymitySet: 0,
        minAnonymitySet: 0,
        criticalVulnerabilities: 0,
        vulnerabilities: [
          "⚠️ No data available for analysis",
          "⚠️ ShadowWire may have low adoption or not indexed yet",
        ],
        recommendations: [
          "💡 Index ShadowWire pool transactions to enable analysis",
          "💡 Check if ShadowWire has active users on mainnet",
        ],
        betterThanPrivacyCash: false,
        betterThanConfidentialTransfers: false,
        matches: [],
      });
    }

    const analysis = shadowwireAttack.analyze(transfers, accounts);

    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing ShadowWire:", error);
    res.status(500).json({ error: "Failed to analyze ShadowWire" });
  }
});

/**
 * GET /api/shadowwire/accounts - Get ShadowWire accounts
 */
app.get("/api/shadowwire/accounts", (req: Request, res: Response) => {
  try {
    const accounts = db.getShadowWireAccounts();

    // Sort by activity (most active first)
    accounts.sort((a, b) => b.totalTransfers - a.totalTransfers);

    res.json({
      accounts,
      count: accounts.length,
    });
  } catch (error) {
    console.error("Error fetching ShadowWire accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

/**
 * GET /api/shadowwire/matches - Get timing attack matches
 */
app.get("/api/shadowwire/matches", (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const minConfidence = parseInt(req.query.minConfidence as string) || 0;

    const transfers = db.getShadowWireTransfers(10000);
    const accountsArray = db.getShadowWireAccounts();
    const accounts = new Map(accountsArray.map((a) => [a.wallet, a]));

    if (transfers.length === 0) {
      return res.json({
        matches: [],
        count: 0,
        message: "No transfers to analyze",
      });
    }

    const analysis = shadowwireAttack.analyze(transfers, accounts);

    // Filter matches by confidence and limit
    let matches = analysis.matches;
    if (minConfidence > 0) {
      matches = matches.filter((m) => m.confidence >= minConfidence);
    }
    matches = matches.slice(0, limit);

    res.json({
      matches,
      count: matches.length,
      totalMatches: analysis.matches.length,
      linkabilityRate: analysis.linkabilityRate,
    });
  } catch (error) {
    console.error("Error fetching ShadowWire matches:", error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

/**
 * GET /api/compare - Compare Privacy Cash vs Confidential Transfers vs ShadowWire
 */
app.get("/api/compare", (req: Request, res: Response) => {
  try {
    // Get Privacy Cash stats
    const pcStats = db.getStats();
    const deposits = db.getDeposits(10000);
    const withdrawals = db.getWithdrawals(10000);
    const { results: pcResults, summary: pcSummary } = timingAttack.analyzeAll(
      withdrawals,
      deposits,
    );

    // Get Confidential Transfer stats
    const ctStats = db.getConfidentialTransfersStats();
    const ctTransfers = db.getConfidentialTransfers(10000);
    const ctAccounts = new Map(
      db.getConfidentialAccounts().map((a) => [a.address, a]),
    );
    const ctMints = new Map(
      db.getConfidentialMints().map((m) => [m.address, m]),
    );

    let ctAnalysis = null;
    if (ctTransfers.length > 0) {
      ctAnalysis = confidentialAnalyzer.analyze(
        ctTransfers,
        ctAccounts,
        ctMints,
      );
    }

    // Get ShadowWire stats
    const swStats = db.getShadowWireStats();
    const swTransfers = db.getShadowWireTransfers(10000);
    const swAccountsArray = db.getShadowWireAccounts();
    const swAccounts = new Map(swAccountsArray.map((a) => [a.wallet, a]));

    let swAnalysis = null;
    if (swTransfers.length > 0) {
      swAnalysis = shadowwireAttack.analyze(swTransfers, swAccounts);
    }

    // Privacy Cash privacy score (based on attack success)
    const pcPrivacyScore = Math.round(
      (1 - pcSummary.attackSuccessRate / 100) * 100,
    );

    res.json({
      privacyCash: {
        protocol: "Privacy Cash",
        programId: process.env.PRIVACY_CASH_PROGRAM_ID || "unknown",
        privacyScore: pcPrivacyScore,
        totalDeposits: pcStats.totalDeposits,
        totalWithdrawals: pcStats.totalWithdrawals,
        avgAnonymitySet: pcSummary.averageAnonymitySet,
        attackSuccessRate: pcSummary.attackSuccessRate,
        criticalVulnerabilities: pcSummary.criticalVulnerabilities,
        hidesAmounts: false,
        hidesAddresses: true,
        usesZKProofs: true,
        zkProofType: "Groth16",
      },
      confidentialTransfers: {
        protocol: "Confidential Transfers (Token-2022)",
        programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        privacyScore: ctAnalysis?.privacyScore || 0,
        totalTransfers: ctStats.total_transfers || 0,
        uniqueUsers: Math.max(
          ctStats.unique_source_owners || 0,
          ctStats.unique_destination_owners || 0,
        ),
        addressReuseRate: ctAnalysis?.addressReuseRate || 0,
        auditorCentralization: ctAnalysis?.auditorCentralization || 0,
        hidesAmounts: true,
        hidesAddresses: false,
        usesZKProofs: false,
        zkProofType: "ElGamal",
        auditorKeys: ctStats.unique_auditors || 0,
      },
      shadowWire: {
        protocol: "ShadowWire",
        programId: "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU",
        privacyScore: swAnalysis?.privacyScore || 0,
        totalTransfers: swStats.total_transfers || 0,
        uniqueUsers: Math.max(
          swStats.unique_senders || 0,
          swStats.unique_recipients || 0,
        ),
        linkabilityRate: swAnalysis?.linkabilityRate || 0,
        addressReuseRate: swAnalysis?.addressReuseRate || 0,
        avgAnonymitySet: swAnalysis?.avgAnonymitySet || 0,
        hidesAmounts: true,
        hidesAddresses: false,
        usesZKProofs: true,
        zkProofType: "Bulletproofs",
        internalTransfers: swStats.internal_transfers || 0,
        externalTransfers: swStats.external_transfers || 0,
      },
      summary: {
        winner: (() => {
          const scores = [
            { name: "Privacy Cash", score: pcPrivacyScore },
            {
              name: "Confidential Transfers",
              score: ctAnalysis?.privacyScore || 0,
            },
            { name: "ShadowWire", score: swAnalysis?.privacyScore || 0 },
          ];
          scores.sort((a, b) => b.score - a.score);
          return scores[0].name;
        })(),
        recommendation:
          "Privacy Cash hides addresses but NOT amounts. " +
          "Confidential Transfers hide amounts but NOT addresses. " +
          "ShadowWire hides amounts (Bulletproofs) but NOT addresses. " +
          "None provide complete privacy! Timing attacks work on ALL protocols.",
        keyFinding:
          "All three protocols are vulnerable to timing correlation attacks. " +
          "True privacy requires BOTH address AND amount privacy, plus timing obfuscation.",
      },
    });
  } catch (error) {
    console.error("Error comparing protocols:", error);
    res.status(500).json({ error: "Failed to compare protocols" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 UNVEIL API server running on http://localhost:${port}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`💾 Cache TTL: ${CACHE_TTL}ms`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down API server...");
  db.close();
  process.exit(0);
});
