/**
 * Confidential Transfers Deposit/Withdraw Indexer
 *
 * KEY INSIGHT: Deposit and Withdraw instructions have PUBLIC amounts!
 *
 * Token-2022 Confidential Transfer flow:
 * 1. User calls Deposit → converts PUBLIC tokens to encrypted balance
 *    - Amount is VISIBLE on-chain!
 * 2. User (or others) call Transfer → moves encrypted balance (amount hidden)
 * 3. User calls Withdraw → converts encrypted back to PUBLIC tokens
 *    - Amount is VISIBLE on-chain!
 *
 * ATTACK VECTOR:
 * - Match Deposit amounts to Withdraw amounts (same user or different)
 * - Add timing correlation
 * - Even if internal transfers are encrypted, we can still link deposits to withdrawals!
 *
 * This is a major privacy weakness in Token-2022 Confidential Transfers.
 */

import dotenv from "dotenv";
dotenv.config();

import { Connection, PublicKey } from "@solana/web3.js";
import {
  CTDeposit,
  CTWithdraw,
  TOKEN_2022_PROGRAM_ID,
  CT_INSTRUCTION_DISCRIMINATORS,
} from "./types";

const TOKEN_2022_PUBKEY = new PublicKey(TOKEN_2022_PROGRAM_ID);

export class CTDepositWithdrawIndexer {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  /**
   * Fetch CT Deposit and Withdraw transactions
   *
   * We specifically look for:
   * - Instruction discriminator 32 (Deposit)
   * - Instruction discriminator 33 (Withdraw)
   *
   * Both have PUBLIC amounts we can extract.
   */
  async fetchDepositWithdrawals(
    limit: number = 1000,
    beforeSignature?: string,
  ): Promise<{ deposits: CTDeposit[]; withdrawals: CTWithdraw[] }> {
    console.log(`Fetching up to ${limit} Token-2022 CT transactions...`);

    try {
      // Get recent signatures for the Token-2022 program
      const signatures = await this.connection.getSignaturesForAddress(
        TOKEN_2022_PUBKEY,
        {
          limit,
          before: beforeSignature,
        },
      );

      console.log(`Fetched ${signatures.length} signatures, parsing...`);

      const deposits: CTDeposit[] = [];
      const withdrawals: CTWithdraw[] = [];

      // Process in batches to avoid rate limits
      const BATCH_SIZE = 10;
      const DELAY_MS = 500;

      for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
        const batch = signatures.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(signatures.length / BATCH_SIZE);

        console.log(`Processing batch ${batchNum}/${totalBatches}...`);

        const batchPromises = batch.map(async (sig) => {
          try {
            return await this.parseTransaction(sig.signature);
          } catch (err) {
            console.error(`Error parsing ${sig.signature}:`, err);
            return null;
          }
        });

        const results = await Promise.all(batchPromises);

        for (const result of results) {
          if (result) {
            if (result.type === "deposit" && result.deposit) {
              deposits.push(result.deposit);
            } else if (result.type === "withdraw" && result.withdraw) {
              withdrawals.push(result.withdraw);
            }
          }
        }

        // Rate limit delay
        if (i + BATCH_SIZE < signatures.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }

      console.log(
        `Found ${deposits.length} deposits and ${withdrawals.length} withdrawals`,
      );
      return { deposits, withdrawals };
    } catch (error) {
      console.error("Error fetching CT transactions:", error);
      throw error;
    }
  }

  /**
   * Parse a transaction to extract CT Deposit or Withdraw data
   */
  private async parseTransaction(signature: string): Promise<{
    type: "deposit" | "withdraw" | null;
    deposit?: CTDeposit;
    withdraw?: CTWithdraw;
  } | null> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta || tx.meta.err) return null;

      const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now();
      const slot = tx.slot;

      // Look through inner instructions for CT operations
      // Token-2022 CT instructions are often inner instructions
      const allInstructions = [
        ...((tx.transaction.message as any).instructions || []),
        ...(tx.meta.innerInstructions?.flatMap((i: any) => i.instructions) ||
          []),
      ];

      for (const ix of allInstructions) {
        // Check if this is a Token-2022 instruction
        const programId = ix.programId?.toString();
        if (programId !== TOKEN_2022_PROGRAM_ID) continue;

        // Try to parse as CT Deposit or Withdraw
        const parsed = this.parseCTInstruction(
          ix,
          tx,
          signature,
          timestamp,
          slot,
        );
        if (parsed) return parsed;
      }

      return null;
    } catch (error) {
      // Silent fail for individual transactions
      return null;
    }
  }

  /**
   * Parse a Token-2022 instruction to check if it's a CT Deposit or Withdraw
   */
  private parseCTInstruction(
    ix: any,
    tx: any,
    signature: string,
    timestamp: number,
    slot: number,
  ): {
    type: "deposit" | "withdraw" | null;
    deposit?: CTDeposit;
    withdraw?: CTWithdraw;
  } | null {
    // Check parsed instruction type
    const parsed = ix.parsed;

    if (
      parsed?.type === "depositIntoConfidentialTransferExtension" ||
      parsed?.type === "confidentialTransferDeposit"
    ) {
      // This is a CT Deposit with PUBLIC amount
      const info = parsed.info;

      return {
        type: "deposit",
        deposit: {
          signature,
          timestamp,
          slot,
          mint: info.mint || this.extractMint(tx),
          owner:
            info.authority || info.owner || this.extractOwner(tx, info.account),
          tokenAccount: info.account || info.tokenAccount,
          amount: info.amount ? parseInt(info.amount) : 0,
          decimals: this.extractDecimals(tx, info.mint),
        },
      };
    }

    if (
      parsed?.type === "withdrawFromConfidentialTransferExtension" ||
      parsed?.type === "confidentialTransferWithdraw"
    ) {
      // This is a CT Withdraw with PUBLIC amount
      const info = parsed.info;

      return {
        type: "withdraw",
        withdraw: {
          signature,
          timestamp,
          slot,
          mint: info.mint || this.extractMint(tx),
          owner:
            info.authority || info.owner || this.extractOwner(tx, info.account),
          tokenAccount: info.account || info.tokenAccount,
          amount: info.amount ? parseInt(info.amount) : 0,
          decimals: this.extractDecimals(tx, info.mint),
        },
      };
    }

    // If not parsed, check instruction data for discriminator
    if (ix.data) {
      const discriminator = this.getDiscriminator(ix.data);

      if (discriminator === CT_INSTRUCTION_DISCRIMINATORS.Deposit) {
        // Parse deposit from raw data
        const deposit = this.parseRawDeposit(
          ix,
          tx,
          signature,
          timestamp,
          slot,
        );
        if (deposit) return { type: "deposit", deposit };
      }

      if (discriminator === CT_INSTRUCTION_DISCRIMINATORS.Withdraw) {
        // Parse withdraw from raw data
        const withdraw = this.parseRawWithdraw(
          ix,
          tx,
          signature,
          timestamp,
          slot,
        );
        if (withdraw) return { type: "withdraw", withdraw };
      }
    }

    return null;
  }

  /**
   * Get instruction discriminator from base64 or hex data
   */
  private getDiscriminator(data: string): number | null {
    try {
      // Try base64 decode
      const decoded = Buffer.from(data, "base64");
      if (decoded.length > 0) {
        return decoded[0];
      }
    } catch {
      // Try hex decode
      try {
        const decoded = Buffer.from(data, "hex");
        if (decoded.length > 0) {
          return decoded[0];
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Parse a raw Deposit instruction
   */
  private parseRawDeposit(
    ix: any,
    tx: any,
    signature: string,
    timestamp: number,
    slot: number,
  ): CTDeposit | null {
    try {
      const data = Buffer.from(ix.data, "base64");
      // Deposit layout: discriminator (1) + amount (8 bytes, little-endian)
      if (data.length < 9) return null;

      const amount = data.readBigUInt64LE(1);

      // Get accounts from instruction
      const accounts = ix.accounts || [];
      const tokenAccount = accounts[0]?.toString() || "unknown";
      const mint = accounts[1]?.toString() || this.extractMint(tx);
      const owner =
        accounts[2]?.toString() || this.extractOwner(tx, tokenAccount);

      return {
        signature,
        timestamp,
        slot,
        mint,
        owner,
        tokenAccount,
        amount: Number(amount),
        decimals: this.extractDecimals(tx, mint),
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse a raw Withdraw instruction
   */
  private parseRawWithdraw(
    ix: any,
    tx: any,
    signature: string,
    timestamp: number,
    slot: number,
  ): CTWithdraw | null {
    try {
      const data = Buffer.from(ix.data, "base64");
      // Withdraw layout: discriminator (1) + amount (8 bytes, little-endian) + proof data
      if (data.length < 9) return null;

      const amount = data.readBigUInt64LE(1);

      // Get accounts from instruction
      const accounts = ix.accounts || [];
      const tokenAccount = accounts[0]?.toString() || "unknown";
      const mint = accounts[1]?.toString() || this.extractMint(tx);
      const owner =
        accounts[2]?.toString() || this.extractOwner(tx, tokenAccount);

      return {
        signature,
        timestamp,
        slot,
        mint,
        owner,
        tokenAccount,
        amount: Number(amount),
        decimals: this.extractDecimals(tx, mint),
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract mint address from transaction
   */
  private extractMint(tx: any): string {
    const balances = tx.meta?.postTokenBalances || [];
    if (balances.length > 0) {
      return balances[0].mint || "unknown";
    }
    return "unknown";
  }

  /**
   * Extract owner from token account
   */
  private extractOwner(tx: any, tokenAccount: string): string {
    const balances = [
      ...(tx.meta?.preTokenBalances || []),
      ...(tx.meta?.postTokenBalances || []),
    ];

    for (const balance of balances) {
      const accountIndex = balance.accountIndex;
      const account = (tx.transaction.message as any).accountKeys?.[
        accountIndex
      ];

      if (
        account?.pubkey?.toString() === tokenAccount ||
        account?.toString() === tokenAccount
      ) {
        return balance.owner || "unknown";
      }
    }
    return "unknown";
  }

  /**
   * Extract decimals from transaction
   */
  private extractDecimals(tx: any, mint: string): number {
    const balances = tx.meta?.postTokenBalances || [];

    for (const balance of balances) {
      if (
        balance.mint === mint &&
        balance.uiTokenAmount?.decimals !== undefined
      ) {
        return balance.uiTokenAmount.decimals;
      }
    }
    return 9; // Default to 9 decimals
  }
}

// CLI entry point
if (require.main === module) {
  const main = async () => {
    const rpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL;

    if (!rpcUrl) {
      console.error(
        "Please set HELIUS_RPC_URL or SOLANA_RPC_URL environment variable",
      );
      process.exit(1);
    }

    const indexer = new CTDepositWithdrawIndexer(rpcUrl);

    console.log(
      "Starting Confidential Transfers Deposit/Withdraw Indexer...\n",
    );
    console.log("KEY INSIGHT: Deposit and Withdraw have PUBLIC amounts!");
    console.log("This creates a timing + amount correlation attack vector.\n");

    const { deposits, withdrawals } =
      await indexer.fetchDepositWithdrawals(500);

    console.log("\nResults:");
    console.log(`  - CT Deposits found: ${deposits.length}`);
    console.log(`  - CT Withdrawals found: ${withdrawals.length}`);

    if (deposits.length > 0) {
      console.log("\nSample Deposits (PUBLIC amounts):");
      for (const d of deposits.slice(0, 5)) {
        console.log(
          `  ${d.signature.slice(0, 20)}... | ${d.amount} | Owner: ${d.owner.slice(0, 20)}...`,
        );
      }
    }

    if (withdrawals.length > 0) {
      console.log("\nSample Withdrawals (PUBLIC amounts):");
      for (const w of withdrawals.slice(0, 5)) {
        console.log(
          `  ${w.signature.slice(0, 20)}... | ${w.amount} | Owner: ${w.owner.slice(0, 20)}...`,
        );
      }
    }

    // Save to database
    if (deposits.length > 0 || withdrawals.length > 0) {
      const { UnveilDatabase } = await import("./db");
      const dbPath = process.env.DATABASE_PATH || "./data/unveil_working.db";
      const db = new UnveilDatabase(dbPath);

      console.log("\nSaving to database...");

      if (deposits.length > 0) {
        db.insertCTDeposits(deposits);
        console.log(`Saved ${deposits.length} CT deposits to database`);
      }

      if (withdrawals.length > 0) {
        db.insertCTWithdrawals(withdrawals);
        console.log(`Saved ${withdrawals.length} CT withdrawals to database`);
      }

      db.close();
      console.log("Database saved successfully!");
    }

    // Look for potential matches
    if (deposits.length > 0 && withdrawals.length > 0) {
      console.log(
        "\nLooking for amount matches (timing correlation attack)...",
      );

      let matchCount = 0;
      for (const deposit of deposits) {
        for (const withdraw of withdrawals) {
          if (
            deposit.amount === withdraw.amount &&
            deposit.timestamp < withdraw.timestamp
          ) {
            matchCount++;
            if (matchCount <= 5) {
              const timeDelta =
                (withdraw.timestamp - deposit.timestamp) / 1000 / 60;
              console.log(
                `  MATCH: ${deposit.amount} tokens | ${timeDelta.toFixed(1)} min apart`,
              );
              console.log(`    Deposit: ${deposit.owner.slice(0, 20)}...`);
              console.log(`    Withdraw: ${withdraw.owner.slice(0, 20)}...`);
            }
          }
        }
      }

      if (matchCount > 0) {
        console.log(`\nVULNERABILITY: Found ${matchCount} potential matches!`);
        console.log(
          "Deposit/Withdraw amounts are PUBLIC and can be correlated.",
        );
      }
    }
  };

  main().catch(console.error);
}
