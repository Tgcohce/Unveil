/**
 * Test Confidential Transfers Analysis
 *
 * Quick test to verify the CT analysis works
 */

import { ConfidentialTransferAnalysis } from "./src/analysis/confidential-analysis";
import type {
  ConfidentialTransfer,
  ConfidentialAccount,
  ConfidentialMint,
} from "./src/indexer/types";

// Mock data for testing
const mockTransfers: ConfidentialTransfer[] = [
  {
    signature: "test1",
    timestamp: Date.now() - 10000,
    slot: 1000,
    mint: "mint1",
    source: "source1",
    destination: "dest1",
    sourceOwner: "owner1",
    destinationOwner: "owner2",
    encryptedAmount: "encrypted_data_1",
    auditorKey: "auditor1",
    instructionType: "Transfer",
  },
  {
    signature: "test2",
    timestamp: Date.now(),
    slot: 1001,
    mint: "mint1",
    source: "source1",
    destination: "dest2",
    sourceOwner: "owner1", // Same owner - address reuse!
    destinationOwner: "owner3",
    encryptedAmount: "encrypted_data_2",
    auditorKey: "auditor1", // Same auditor - centralization!
    instructionType: "Transfer",
  },
];

const mockAccounts = new Map<string, ConfidentialAccount>([
  [
    "owner1",
    {
      address: "owner1",
      owner: "owner1",
      mint: "mint1",
      firstConfidentialTx: Date.now() - 10000,
      lastConfidentialTx: Date.now(),
      totalConfidentialTxs: 2,
      alsoUsedPublic: true, // Mixed public/confidential!
    },
  ],
  [
    "owner2",
    {
      address: "owner2",
      owner: "owner2",
      mint: "mint1",
      firstConfidentialTx: Date.now() - 10000,
      lastConfidentialTx: Date.now() - 10000,
      totalConfidentialTxs: 1,
      alsoUsedPublic: false,
    },
  ],
]);

const mockMints = new Map<string, ConfidentialMint>([
  [
    "mint1",
    {
      address: "mint1",
      auditorKey: "auditor1",
      totalConfidentialTxs: 2,
      uniqueUsers: 3,
      firstSeen: Date.now() - 10000,
      lastSeen: Date.now(),
    },
  ],
]);

console.log("🧪 Testing Confidential Transfers Analysis...\n");
console.log("=".repeat(60));

const analyzer = new ConfidentialTransferAnalysis();
const result = analyzer.analyze(mockTransfers, mockAccounts, mockMints);

console.log(analyzer.generateSummary(result));

console.log("\n✅ Analysis complete!");
console.log(`\nPrivacy Score: ${result.privacyScore}/100`);

if (result.privacyScore < 50) {
  console.log("\n⚠️  WARNING: Privacy score is low!");
  console.log("This indicates significant privacy vulnerabilities.");
} else {
  console.log("\n✅ Privacy score is acceptable.");
}

console.log("\n📝 Note: This is mock data for testing.");
console.log(
  "Run 'npx tsx index-confidential.ts' to analyze real Token-2022 data.",
);
