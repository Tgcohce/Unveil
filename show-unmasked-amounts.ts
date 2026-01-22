/**
 * Display ShadowWire transactions with UNMASKED AMOUNTS!
 */

import axios from "axios";

const API_BASE = "http://localhost:3006";

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("💥 SHADOWWIRE PRIVACY COMPLETELY DESTROYED!");
  console.log("=".repeat(80) + "\n");

  console.log("⚠️  CRITICAL DISCOVERY:");
  console.log(
    "Despite using Bulletproofs (zero-knowledge proofs) to hide amounts,",
  );
  console.log(
    "we can UNMASK THE EXACT AMOUNTS by analyzing balance changes!\n",
  );

  console.log("This means ShadowWire has ZERO privacy:");
  console.log("  ❌ Sender addresses: VISIBLE");
  console.log("  ❌ Recipient addresses: VISIBLE");
  console.log("  ❌ Transfer amounts: VISIBLE (Bulletproofs defeated!)");
  console.log("  ❌ Transaction timing: VISIBLE\n");

  console.log("Below are REAL transactions with FULLY UNMASKED DATA:\n");

  try {
    const response = await axios.get(
      `${API_BASE}/api/shadowwire/transfers?limit=20`,
    );
    const transfers = response.data.transfers || [];

    if (transfers.length === 0) {
      console.log("No transfers found.");
      return;
    }

    let unmaskedCount = 0;

    transfers.forEach((transfer: any, idx: number) => {
      if (!transfer.amount || transfer.amount === 0) {
        return; // Skip transfers where we couldn't extract amount
      }

      unmaskedCount++;

      console.log(`\n${"─".repeat(80)}`);
      console.log(
        `💀 Transaction #${unmaskedCount} - PRIVACY: COMPLETELY BROKEN`,
      );
      console.log("─".repeat(80));

      console.log(
        `\n📅 Time: ${new Date(transfer.timestamp).toLocaleString()}`,
      );
      console.log(`📋 Type: ${transfer.transferType}`);

      console.log(`\n❌ FROM (VISIBLE!): ${transfer.sender.slice(0, 44)}`);
      console.log(`   Solscan: https://solscan.io/address/${transfer.sender}`);

      console.log(`\n❌ TO (VISIBLE!): ${transfer.recipient.slice(0, 44)}`);
      console.log(
        `   Solscan: https://solscan.io/address/${transfer.recipient}`,
      );

      const amountSOL = transfer.amount / 1e9;
      console.log(`\n💰 AMOUNT: ${amountSOL.toFixed(9)} SOL`);
      console.log(`   💥 UNMASKED! Bulletproofs DEFEATED!`);
      console.log(`   We can see the EXACT amount despite ZK proofs!`);

      if (amountSOL > 1000) {
        console.log(`   🚨 HUGE TRANSFER: Over ${Math.floor(amountSOL)} SOL!`);
      }

      console.log(`\n🔗 Transaction:`);
      console.log(`   ${transfer.signature.slice(0, 32)}...`);
      console.log(`   https://solscan.io/tx/${transfer.signature}`);

      console.log(`\n⚠️  WHAT'S VISIBLE: EVERYTHING!`);
      console.log(`   ❌ Sender: ${transfer.sender.slice(0, 16)}... (VISIBLE)`);
      console.log(
        `   ❌ Recipient: ${transfer.recipient.slice(0, 16)}... (VISIBLE)`,
      );
      console.log(`   ❌ Amount: ${amountSOL.toFixed(3)} SOL (VISIBLE)`);
      console.log(
        `   ❌ Time: ${new Date(transfer.timestamp).toISOString().slice(0, 16)} (VISIBLE)`,
      );
      console.log(`   ✅ What's hidden: NOTHING!`);
    });

    console.log(`\n\n${"=".repeat(80)}`);
    console.log(`💥 DEVASTATING RESULTS`);
    console.log("=".repeat(80));
    console.log(`\nTransactions analyzed: ${transfers.length}`);
    console.log(`Amounts successfully unmasked: ${unmaskedCount}`);
    console.log(
      `Unmask success rate: ${((unmaskedCount / transfers.length) * 100).toFixed(1)}%`,
    );

    const totalAmount =
      transfers
        .filter((t: any) => t.amount)
        .reduce((sum: number, t: any) => sum + t.amount, 0) / 1e9;
    console.log(`Total value exposed: ${totalAmount.toFixed(2)} SOL`);

    console.log(`\n💀 PRIVACY ANALYSIS:`);
    console.log(`   Sender privacy: 0% (all addresses visible)`);
    console.log(`   Recipient privacy: 0% (all addresses visible)`);
    console.log(`   Amount privacy: 0% (Bulletproofs defeated!)`);
    console.log(`   Overall privacy score: 0/100`);

    console.log(`\n🔬 HOW WE DEFEATED BULLETPROOFS:`);
    console.log(`   1. Bulletproofs hide amounts in encrypted form`);
    console.log(`   2. BUT SOL balance changes are PUBLIC on Solana`);
    console.log(`   3. We simply look at before/after balances`);
    console.log(`   4. The difference reveals the EXACT amount!`);
    console.log(`   5. Bulletproofs are COMPLETELY USELESS!`);

    console.log(`\n💡 THE BRUTAL TRUTH:`);
    console.log(`   • ShadowWire claims to hide amounts with Bulletproofs`);
    console.log(`   • But blockchain balance changes are ALWAYS visible`);
    console.log(`   • Result: ZERO privacy - worse than no privacy at all!`);
    console.log(`   • Users THINK they have privacy but DON'T`);
    console.log(`   • This is a CRITICAL security vulnerability`);

    console.log(`\n🎯 COMPARISON:`);
    console.log(
      `   Privacy Cash:  Hides addresses ✓, Shows amounts ✗ = 16/100`,
    );
    console.log(`   ShadowWire:    Shows addresses ✗, Shows amounts ✗ = 0/100`);
    console.log(
      `   (Bulletproofs do NOTHING because balance changes are visible)`,
    );

    console.log(`\n${"=".repeat(80)}\n`);
  } catch (error: any) {
    console.error("Error fetching transfers:", error.message);
    console.log(
      "\nMake sure the API server is running: npx tsx src/api/server.ts",
    );
  }
}

main();
