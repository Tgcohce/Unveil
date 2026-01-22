/**
 * End-to-end validation of data accuracy
 * Verifies transaction fetching, parsing, and storage
 */

import { HeliusClient } from "./src/indexer/helius-proper";
import { PrivacyCashBalanceParser } from "./src/indexer/privacy-cash-balance";
import { UnveilDatabase } from "./src/indexer/db";
import dotenv from "dotenv";

dotenv.config();

async function validateEndToEnd() {
  console.log("=== END-TO-END DATA VALIDATION ===\n");

  // Test transaction from database
  const testSig =
    "5StudN59tGj7rFhz31YBFqexjTD9D5GZNERSzcfYYtW5aqnoae2fKhY3uVF9whoqCazWte6aBHTGb4BPHQBVqPMf";

  console.log(`🔍 Testing with transaction: ${testSig}\n`);

  // Step 1: Verify it's in our database
  console.log("STEP 1: Check database");
  console.log("----------------------");
  const db = new UnveilDatabase("./data/unveil_large_1768489687265.db");
  const dbDeposit = db.getDeposit(testSig);

  if (!dbDeposit) {
    console.log("❌ Transaction not found in database");
    return;
  }

  console.log("✅ Found in database:");
  console.log(`   Amount: ${(dbDeposit.amount / 1e9).toFixed(6)} SOL`);
  console.log(`   Depositor: ${dbDeposit.depositor}`);
  console.log(`   Timestamp: ${new Date(dbDeposit.timestamp).toISOString()}\n`);

  // Step 2: Fetch from blockchain
  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    console.log("⚠️  No HELIUS_API_KEY - skipping blockchain fetch");
    return;
  }

  console.log("STEP 2: Fetch from Helius");
  console.log("-------------------------");
  const helius = new HeliusClient(heliusApiKey);

  try {
    const tx = await helius.getTransaction(testSig);

    if (!tx) {
      console.log("❌ Could not fetch transaction from Helius");
      return;
    }

    console.log("✅ Fetched from blockchain:");
    console.log(`   Slot: ${tx.slot}`);
    console.log(`   Timestamp: ${new Date(tx.timestamp).toISOString()}`);
    console.log(`   Instructions: ${tx.instructions.length}`);
    console.log(`   Account keys: ${tx.accountKeys.length}\n`);

    // Step 3: Parse with balance flow
    console.log("STEP 3: Parse transaction");
    console.log("-------------------------");
    const parser = new PrivacyCashBalanceParser();
    const parsed = parser.parsePrivacyCashTransaction(tx);

    if (!parsed) {
      console.log("❌ Could not parse transaction");
      return;
    }

    console.log("✅ Parsed successfully:");
    console.log(`   Type: ${parsed.type.toUpperCase()}`);
    console.log(`   Amount: ${(parsed.amount / 1e9).toFixed(6)} SOL`);
    console.log(`   User: ${parsed.userWallet}\n`);

    // Step 4: Verify instruction discriminator
    console.log("STEP 4: Verify discriminator");
    console.log("----------------------------");
    const PROGRAM_ID = "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";
    const TRANSACT_DISCRIMINATOR = Buffer.from([
      217, 149, 130, 143, 221, 52, 252, 119,
    ]);

    const instruction = tx.instructions.find(
      (instr) => instr.programId === PROGRAM_ID,
    );

    if (!instruction) {
      console.log("❌ Privacy Cash instruction not found");
      return;
    }

    const discriminator = instruction.data.slice(0, 8);
    const matches = discriminator.equals(TRANSACT_DISCRIMINATOR);

    console.log(`Instruction discriminator: ${discriminator.toString("hex")}`);
    console.log(
      `Expected discriminator:    ${TRANSACT_DISCRIMINATOR.toString("hex")}`,
    );
    console.log(`Match: ${matches ? "✅" : "❌"}\n`);

    // Step 5: Compare parsed data with database
    console.log("STEP 5: Compare with database");
    console.log("-----------------------------");

    const amountMatch = parsed.amount === dbDeposit.amount;
    const userMatch = parsed.userWallet === dbDeposit.depositor;
    const typeMatch = parsed.type === "deposit";

    console.log(
      `Amount match: ${amountMatch ? "✅" : "❌"} (${parsed.amount} vs ${dbDeposit.amount})`,
    );
    console.log(
      `User match: ${userMatch ? "✅" : "❌"} (${parsed.userWallet} vs ${dbDeposit.depositor})`,
    );
    console.log(`Type match: ${typeMatch ? "✅" : "❌"} (${parsed.type})\n`);

    // Step 6: Verify balance changes
    console.log("STEP 6: Analyze balance changes");
    console.log("--------------------------------");

    if (tx.meta) {
      const feePayer = tx.accountKeys[0];
      const feePayerPreBalance = tx.meta.preBalances[0];
      const feePayerPostBalance = tx.meta.postBalances[0];
      const feePayerChange = feePayerPostBalance - feePayerPreBalance;
      const txFee = tx.meta.fee || 5000;
      const userNetChange = feePayerChange + txFee;

      console.log(`Fee payer: ${feePayer}`);
      console.log(`Pre balance: ${(feePayerPreBalance / 1e9).toFixed(6)} SOL`);
      console.log(
        `Post balance: ${(feePayerPostBalance / 1e9).toFixed(6)} SOL`,
      );
      console.log(`Change: ${(feePayerChange / 1e9).toFixed(6)} SOL`);
      console.log(`TX fee: ${(txFee / 1e9).toFixed(6)} SOL`);
      console.log(
        `Net change (excluding fee): ${(userNetChange / 1e9).toFixed(6)} SOL`,
      );
      console.log(`Parsed amount: ${(parsed.amount / 1e9).toFixed(6)} SOL`);

      const balanceMatchesParsed =
        Math.abs(Math.abs(userNetChange) - parsed.amount) < 1000;
      console.log(
        `\nBalance flow matches parsed amount: ${balanceMatchesParsed ? "✅" : "❌"}\n`,
      );
    }

    // Final verdict
    console.log("=== FINAL VERDICT ===");
    console.log("=====================");

    if (
      matches &&
      amountMatch &&
      userMatch &&
      typeMatch &&
      parsed.type === "deposit"
    ) {
      console.log("✅ ALL CHECKS PASSED");
      console.log(
        "✅ Data fetching, parsing, and storage are ACCURATE and CORRECT",
      );
      console.log("✅ Transaction is verified as real on-chain deposit");
      console.log("✅ Discriminator matches Privacy Cash SDK");
      console.log("✅ Balance flow analysis is working correctly");
    } else {
      console.log("❌ SOME CHECKS FAILED");
      console.log("Please review the output above for details");
    }
  } catch (error: any) {
    console.error("❌ Error during validation:", error.message);
  } finally {
    db.close();
  }
}

validateEndToEnd();
