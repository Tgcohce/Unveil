/**
 * Privacy Cash SOL balance flow parser
 * Infers operation type from SOL balance changes instead of instruction discriminators
 */

import {
  ParsedTransaction,
  ParsedPrivacyCashTx,
  Deposit,
  Withdrawal,
} from "./types";

const PROGRAM_ID = "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD";
const POOL_ACCOUNT = "4AV2Qzp3N4c9RfzyEbNZs2wqWfW4EwKnnxFAZCndvfGh"; // Main pool account that holds funds

export class PrivacyCashBalanceParser {
  /**
   * Parse Privacy Cash transaction using SOL balance flow analysis
   */
  parsePrivacyCashTransaction(
    tx: ParsedTransaction,
  ): ParsedPrivacyCashTx | null {
    if (!tx.meta || !tx.accountKeys) {
      console.warn(`Missing balance data: ${tx.signature}`);
      return null;
    }

    // Get all account keys
    const accountKeys = tx.accountKeys;

    // Find program index
    const programIndex = accountKeys.indexOf(PROGRAM_ID);
    if (programIndex === -1) {
      console.warn(`Privacy Cash program not found: ${tx.signature}`);
      return null;
    }

    // Calculate balance changes for each account
    const balanceChanges: { address: string; change: number }[] = [];
    for (let i = 0; i < accountKeys.length; i++) {
      const change = tx.meta.postBalances[i] - tx.meta.preBalances[i];
      if (change !== 0) {
        balanceChanges.push({ address: accountKeys[i], change });
      }
    }

    // Debug logging for first 10 transactions
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_PRIVACY_CASH
    ) {
      console.log(`\n=== ${tx.signature} ===`);
      console.log("Balance changes:", balanceChanges);
      console.log("Fee:", tx.meta.fee);
    }

    // Find the fee payer (first signer)
    const feePayer = accountKeys[0];
    const feePayerChange =
      balanceChanges.find((b) => b.address === feePayer)?.change || 0;

    // Determine operation type based on balance change patterns
    // Look for significant SOL transfers (> 0.01 SOL = 10M lamports)
    const SIGNIFICANT_THRESHOLD = 10_000_000;

    // Find the largest positive change (excluding small rent credits)
    const largestGain = balanceChanges
      .filter(b => b.change > SIGNIFICANT_THRESHOLD)
      .sort((a, b) => b.change - a.change)[0];

    // Find the largest negative change (excluding just fees)
    const largestLoss = balanceChanges
      .filter(b => b.change < -SIGNIFICANT_THRESHOLD)
      .sort((a, b) => a.change - b.change)[0];

    let type: "deposit" | "withdrawal" | "unknown" = "unknown";
    let amount = 0;
    let userWallet = feePayer;

    // Pattern detection:
    // DEPOSIT: Fee payer loses significant SOL (> 0.01 SOL beyond fees)
    // WITHDRAWAL: Someone gains significant SOL (> 0.01 SOL)

    if (largestGain && largestGain.address !== feePayer) {
      // Someone OTHER than fee payer received significant SOL = WITHDRAWAL
      type = "withdrawal";
      amount = largestGain.change;
      userWallet = largestGain.address;
    } else if (largestLoss && largestLoss.address === feePayer) {
      // Fee payer lost significant SOL = DEPOSIT
      type = "deposit";
      amount = Math.abs(largestLoss.change + tx.meta.fee); // Add back fee
      userWallet = feePayer;
    }

    // Debug logging
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_PRIVACY_CASH
    ) {
      console.log(`\n=== ${tx.signature} ===`);
      console.log("Fee payer:", feePayer);
      console.log("Fee payer change:", feePayerChange);
      console.log("Largest gain:", largestGain);
      console.log("Largest loss:", largestLoss);
      console.log("Balance changes:", balanceChanges);
      console.log("Determined type:", type);
      console.log("Amount:", amount);
      console.log("User wallet:", userWallet);
    }

    if (type === "unknown") {
      return null;
    }

    return {
      signature: tx.signature,
      timestamp: tx.timestamp,
      type,
      amount,
      userWallet,
    };
  }

  /**
   * Convert ParsedPrivacyCashTx to Deposit format
   */
  toDeposit(parsed: ParsedPrivacyCashTx, slot: number): Deposit | null {
    if (parsed.type !== "deposit") return null;

    return {
      signature: parsed.signature,
      timestamp: parsed.timestamp,
      slot: slot,
      amount: parsed.amount,
      depositor: parsed.userWallet,
      commitment: "unknown", // Cannot extract from balance flow
      spent: false,
    };
  }

  /**
   * Convert ParsedPrivacyCashTx to Withdrawal format
   */
  toWithdrawal(parsed: ParsedPrivacyCashTx, slot: number): Withdrawal | null {
    if (parsed.type !== "withdrawal") return null;

    return {
      signature: parsed.signature,
      timestamp: parsed.timestamp,
      slot: slot,
      amount: parsed.amount,
      recipient: parsed.userWallet,
      nullifier: "unknown", // Cannot extract from balance flow
      relayer: "unknown", // Cannot extract from balance flow
      fee: 0, // Cannot extract from balance flow
    };
  }

  /**
   * Parse multiple transactions and return deposits/withdrawals
   */
  parseTransactions(transactions: ParsedTransaction[]): {
    deposits: Deposit[];
    withdrawals: Withdrawal[];
    unknown: number;
  } {
    const deposits: Deposit[] = [];
    const withdrawals: Withdrawal[] = [];
    let unknown = 0;

    for (const tx of transactions) {
      const parsed = this.parsePrivacyCashTransaction(tx);

      if (!parsed) {
        unknown++;
        continue;
      }

      if (parsed.type === "deposit") {
        const deposit = this.toDeposit(parsed, tx.slot);
        if (deposit) deposits.push(deposit);
      } else if (parsed.type === "withdrawal") {
        const withdrawal = this.toWithdrawal(parsed, tx.slot);
        if (withdrawal) withdrawals.push(withdrawal);
      } else {
        unknown++;
      }
    }

    return { deposits, withdrawals, unknown };
  }
}
