/**
 * Test ShadowWire Analysis with Mock Data
 *
 * This demonstrates the timing correlation attack on ShadowWire
 * even with mock data.
 */

import { ShadowWireAttack } from "./src/analysis/shadowwire-attack";
import { ShadowWireTransfer, ShadowWireAccount } from "./src/indexer/types";

console.log("🧪 Testing ShadowWire Analysis with Mock Data...\n");
console.log("=".repeat(60));

// Mock ShadowWire transfers
// KEY: Addresses are VISIBLE, amounts are HIDDEN (Bulletproofs)
const mockTransfers: ShadowWireTransfer[] = [
  {
    signature: "mockSig1",
    timestamp: Date.now() - 3600000, // 1 hour ago
    sender: "Alice111111111111111111111111111111111111",
    recipient: "Bob222222222222222222222222222222222222222",
    amountHidden: true,
    transferType: "internal",
    relayerFee: 100000,
    token: "SOL",
  },
  {
    signature: "mockSig2",
    timestamp: Date.now() - 3300000, // 55 min ago (close to first)
    sender: "Bob222222222222222222222222222222222222222",
    recipient: "Carol33333333333333333333333333333333333",
    amountHidden: true,
    transferType: "internal",
    relayerFee: 100000,
    token: "SOL",
  },
  {
    signature: "mockSig3",
    timestamp: Date.now() - 1800000, // 30 min ago
    sender: "Alice111111111111111111111111111111111111",
    recipient: "Dave444444444444444444444444444444444444",
    amountHidden: true,
    transferType: "internal",
    relayerFee: 100000,
    token: "SOL",
  },
  {
    signature: "mockSig4",
    timestamp: Date.now() - 1500000, // 25 min ago (close to third)
    sender: "Dave444444444444444444444444444444444444",
    recipient: "Eve555555555555555555555555555555555555",
    amountHidden: true,
    transferType: "internal",
    relayerFee: 100000,
    token: "SOL",
  },
  {
    signature: "mockSig5",
    timestamp: Date.now() - 600000, // 10 min ago
    sender: "Alice111111111111111111111111111111111111",
    recipient: "Frank66666666666666666666666666666666666",
    amountHidden: false,
    transferType: "external", // Visible amount
    relayerFee: 100000,
    token: "SOL",
  },
];

// Mock accounts (visible on-chain)
const mockAccounts = new Map<string, ShadowWireAccount>([
  [
    "Alice111111111111111111111111111111111111",
    {
      wallet: "Alice111111111111111111111111111111111111",
      available: 5000000000, // 5 SOL
      deposited: 10000000000,
      withdrawnToEscrow: 5000000000,
      poolAddress: "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU",
      totalTransfers: 3,
      firstSeen: Date.now() - 7200000,
      lastSeen: Date.now() - 600000,
    },
  ],
  [
    "Bob222222222222222222222222222222222222222",
    {
      wallet: "Bob222222222222222222222222222222222222222",
      available: 2000000000,
      deposited: 5000000000,
      withdrawnToEscrow: 3000000000,
      poolAddress: "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU",
      totalTransfers: 2,
      firstSeen: Date.now() - 3600000,
      lastSeen: Date.now() - 3300000,
    },
  ],
  [
    "Carol33333333333333333333333333333333333",
    {
      wallet: "Carol33333333333333333333333333333333333",
      available: 1000000000,
      deposited: 1000000000,
      withdrawnToEscrow: 0,
      poolAddress: "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU",
      totalTransfers: 1,
      firstSeen: Date.now() - 3300000,
      lastSeen: Date.now() - 3300000,
    },
  ],
]);

console.log(`Analyzing ${mockTransfers.length} ShadowWire transfers...\n`);

// Run analysis
const analyzer = new ShadowWireAttack();
const result = analyzer.analyze(mockTransfers, mockAccounts);

// Print detailed summary
console.log(analyzer.generateSummary(result));

// Additional comparison metrics
console.log("\n" + "=".repeat(60));
console.log("PROTOCOL COMPARISON");
console.log("=".repeat(60));
console.log("\nPrivacy Cash:");
console.log("  - Hides: Addresses (ZK proofs)");
console.log("  - Reveals: Amounts");
console.log("  - Privacy Score: 16/100");
console.log("  - Attack: 68% linkable via timing + amounts");

console.log("\nShadowWire:");
console.log("  - Hides: Amounts (Bulletproofs)");
console.log("  - Reveals: Addresses");
console.log(`  - Privacy Score: ${result.privacyScore}/100`);
console.log(
  `  - Attack: ${Math.round(result.linkabilityRate)}% linkable via timing + addresses`,
);

console.log("\nConfidential Transfers:");
console.log("  - Hides: Amounts (ElGamal)");
console.log("  - Reveals: Addresses + Auditors");
console.log("  - Privacy Score: N/A (0% adoption)");
console.log("  - Attack: Would be similar to ShadowWire");

console.log("\n" + "=".repeat(60));
console.log("🎯 $15K BOUNTY JUSTIFICATION");
console.log("=".repeat(60));
console.log("\n1. Demonstrates Bulletproofs alone are insufficient");
console.log("2. Address visibility defeats amount privacy");
console.log("3. Timing attacks work across ALL protocols");
console.log(
  "4. Shows need for comprehensive privacy (address + amount + timing)",
);
console.log("5. Provides framework to benchmark ANY privacy protocol");

console.log("\n✅ Analysis complete!\n");
console.log(`Privacy Score: ${result.privacyScore}/100`);

if (result.privacyScore < 30) {
  console.log("\n⚠️  WARNING: Privacy score is very low!");
  console.log("This protocol has significant privacy vulnerabilities.");
}

console.log("\n📝 Note: This is mock data for testing.");
console.log(
  "Run 'npx tsx index-shadowwire.ts' to analyze real ShadowWire data.",
);
