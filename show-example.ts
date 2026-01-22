/**
 * Show a real privacy attack example with Solscan verification links
 */

import { UnveilDatabase } from "./src/indexer/db";
import { TimingCorrelationAttack } from "./src/analysis/timing-attack";

const db = new UnveilDatabase("./data/unveil_working.db");
const attack = new TimingCorrelationAttack();

const deps = db.getDeposits(1000);
const wds = db.getWithdrawals(1000);

console.log("🔍 Finding a clear privacy attack example...\n");

// Find a withdrawal with anonymity set of 1 (completely broken privacy)
const results = wds.slice(0, 100).map((w) => attack.analyzeWithdrawal(w, deps));
const criticalMatch = results.find(
  (r) => r.anonymitySet === 1 && r.likelySources.length > 0,
);

if (!criticalMatch) {
  console.log("No critical vulnerability found in first 100 withdrawals.");
  process.exit(0);
}

const withdrawal = criticalMatch.withdrawal;
const source = criticalMatch.likelySources[0];
const deposit = source.deposit;

console.log("═══════════════════════════════════════════════════════════");
console.log("  🚨 PRIVACY ATTACK EXAMPLE - VERIFY ON BLOCKCHAIN 🚨");
console.log("═══════════════════════════════════════════════════════════\n");

console.log("📥 STEP 1: DEPOSIT (Money Goes In)");
console.log("─────────────────────────────────────────────────────────");
console.log("Amount:     ", (deposit.amount / 1e9).toFixed(6), "SOL");
console.log("Time:       ", new Date(deposit.timestamp).toISOString());
console.log("Depositor:  ", deposit.depositor);
console.log("");
console.log("Transaction:", deposit.signature);
console.log("🔗 Verify:   https://solscan.io/tx/" + deposit.signature);
console.log("");
console.log("What to look for on Solscan:");
console.log(
  "  - Fee payer loses ~" + (deposit.amount / 1e9).toFixed(2) + " SOL",
);
console.log(
  "  - Privacy Cash program (9fhQBbum...yQD) gains ~" +
    (deposit.amount / 1e9).toFixed(2) +
    " SOL",
);
console.log("");

console.log(
  "⏱️  TIME PASSES: " + Math.floor(source.timeDelta / 60000) + " minutes",
);
console.log("");

console.log("📤 STEP 2: WITHDRAWAL (Money Comes Out)");
console.log("─────────────────────────────────────────────────────────");
console.log("Amount:     ", (withdrawal.amount / 1e9).toFixed(6), "SOL");
console.log("Time:       ", new Date(withdrawal.timestamp).toISOString());
console.log("Recipient:  ", withdrawal.recipient);
console.log("");
console.log("Transaction:", withdrawal.signature);
console.log("🔗 Verify:   https://solscan.io/tx/" + withdrawal.signature);
console.log("");
console.log("What to look for on Solscan:");
console.log(
  "  - Privacy Cash program loses ~" +
    (withdrawal.amount / 1e9).toFixed(2) +
    " SOL",
);
console.log(
  "  - Recipient gains ~" + (withdrawal.amount / 1e9).toFixed(2) + " SOL",
);
console.log("");

console.log("═══════════════════════════════════════════════════════════");
console.log("  🔗 THE ATTACK: WE CAN LINK THEM!");
console.log("═══════════════════════════════════════════════════════════\n");

const deltaMin = Math.floor(source.timeDelta / 60000);
const deltaHours = (source.timeDelta / 3600000).toFixed(1);
const amountRatio = ((withdrawal.amount / deposit.amount) * 100).toFixed(2);
const fee = ((deposit.amount - withdrawal.amount) / 1e9).toFixed(6);
const feePercent = (
  ((deposit.amount - withdrawal.amount) / deposit.amount) *
  100
).toFixed(2);

console.log("Why we can link these transactions:");
console.log("");
console.log("  1️⃣  UNIQUENESS:  Only 1 deposit matches this withdrawal");
console.log("                  (Anonymity set = 1 = CRITICAL vulnerability)");
console.log("");
console.log(
  "  2️⃣  TIMING:      Withdrawal happened " +
    deltaMin +
    " minutes (" +
    deltaHours +
    " hours) after deposit",
);
if (deltaMin < 60) {
  console.log("                  This is IMMEDIATE - zero time-based privacy!");
}
console.log("");
console.log("  3️⃣  AMOUNT:      Withdrawal is " + amountRatio + "% of deposit");
console.log("                  Fee: " + fee + " SOL (" + feePercent + "%)");
console.log("                  Perfect match accounting for withdrawal fee!");
console.log("");
console.log(
  "  4️⃣  CONFIDENCE:  " +
    (source.confidence * 100).toFixed(0) +
    "% confidence this is the correct link",
);
console.log("");

console.log("═══════════════════════════════════════════════════════════");
console.log("  🚨 PRIVACY BROKEN - WE KNOW WHO SENT TO WHO");
console.log("═══════════════════════════════════════════════════════════\n");

console.log(
  "  Depositor:  " +
    deposit.depositor.slice(0, 12) +
    "..." +
    deposit.depositor.slice(-12),
);
console.log("      │");
console.log("      │  Deposited " + (deposit.amount / 1e9).toFixed(3) + " SOL");
console.log("      │");
console.log("      ▼");
console.log("  [ Privacy Cash Pool ]  ← Supposed to hide the link");
console.log("      │");
console.log("      │  " + deltaMin + " minutes later...");
console.log("      │");
console.log("      ▼");
console.log(
  "  Recipient:  " +
    withdrawal.recipient.slice(0, 12) +
    "..." +
    withdrawal.recipient.slice(-12),
);
console.log("      │");
console.log(
  "      │  Received " + (withdrawal.amount / 1e9).toFixed(3) + " SOL",
);
console.log("      ▼");
console.log("");

console.log("═══════════════════════════════════════════════════════════\n");
console.log(
  "💡 CONCLUSION: We can say with " +
    (source.confidence * 100).toFixed(0) +
    "% confidence that:",
);
console.log("");
console.log("   " + deposit.depositor);
console.log("");
console.log("   sent money to:");
console.log("");
console.log("   " + withdrawal.recipient);
console.log("");
console.log("   Privacy Cash did NOT hide this transaction!");
console.log("");
console.log("═══════════════════════════════════════════════════════════\n");

console.log("📊 Overall Statistics:");
console.log("  - Total withdrawals analyzed: " + results.length);
console.log(
  "  - Vulnerable (anonymity ≤ 5): " +
    results.filter((r) => r.anonymitySet <= 5).length,
);
console.log(
  "  - Critical (anonymity = 1): " +
    results.filter((r) => r.anonymitySet === 1).length,
);
console.log(
  "  - Privacy broken on: " +
    (
      (results.filter((r) => r.anonymitySet <= 5).length / results.length) *
      100
    ).toFixed(1) +
    "% of withdrawals",
);
console.log("");

db.close();
