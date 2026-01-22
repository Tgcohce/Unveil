/**
 * Confidential Transfers Indexer V2
 *
 * Uses Helius enhanced APIs to find CT transactions more efficiently.
 * Targets known CT-enabled mints like PYUSD.
 *
 * KEY INSIGHT: Deposit and Withdraw instructions have PUBLIC amounts!
 * This creates a timing + amount correlation attack vector.
 */

import dotenv from "dotenv";
dotenv.config();

import { Helius } from "helius-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { CTDeposit, CTWithdraw, TOKEN_2022_PROGRAM_ID } from "./types";

// Known CT-enabled mints on Solana mainnet
const CT_ENABLED_MINTS = {
  // PYUSD - PayPal USD (has confidential transfers enabled)
  PYUSD: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
};

export class CTIndexerV2 {
  private helius: Helius;
  private connection: Connection;

  constructor(heliusApiKey: string) {
    this.helius = new Helius(heliusApiKey);
    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  /**
   * Fetch CT transactions for a specific mint
   */
  async fetchCTTransactionsForMint(
    mintAddress: string,
    limit: number = 500,
  ): Promise<{ deposits: CTDeposit[]; withdrawals: CTWithdraw[] }> {
    console.log(`\nFetching CT transactions for mint: ${mintAddress}`);

    const deposits: CTDeposit[] = [];
    const withdrawals: CTWithdraw[] = [];

    try {
      // Get recent signatures for this mint
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(mintAddress),
        { limit },
      );

      console.log(`Found ${signatures.length} transactions for mint`);

      // Process in smaller batches
      const BATCH_SIZE = 5;
      const DELAY_MS = 1000;

      for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
        const batch = signatures.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(signatures.length / BATCH_SIZE);

        if (batchNum % 10 === 1) {
          console.log(`Processing batch ${batchNum}/${totalBatches}...`);
        }

        for (const sig of batch) {
          try {
            const result = await this.parseTransaction(
              sig.signature,
              mintAddress,
            );
            if (result) {
              if (result.type === "deposit" && result.deposit) {
                deposits.push(result.deposit);
              } else if (result.type === "withdraw" && result.withdraw) {
                withdrawals.push(result.withdraw);
              }
            }
          } catch (err) {
            // Silent fail for individual transactions
          }
        }

        // Rate limit
        if (i + BATCH_SIZE < signatures.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }

      console.log(
        `Found ${deposits.length} CT deposits and ${withdrawals.length} CT withdrawals`,
      );
      return { deposits, withdrawals };
    } catch (error) {
      console.error("Error fetching CT transactions:", error);
      throw error;
    }
  }

  /**
   * Fetch CT transactions for all known CT-enabled mints
   */
  async fetchAllCTTransactions(
    limit: number = 200,
  ): Promise<{ deposits: CTDeposit[]; withdrawals: CTWithdraw[] }> {
    const allDeposits: CTDeposit[] = [];
    const allWithdrawals: CTWithdraw[] = [];

    for (const [name, mint] of Object.entries(CT_ENABLED_MINTS)) {
      console.log(`\n=== Indexing ${name} (${mint}) ===`);

      try {
        const { deposits, withdrawals } = await this.fetchCTTransactionsForMint(
          mint,
          limit,
        );
        allDeposits.push(...deposits);
        allWithdrawals.push(...withdrawals);
      } catch (err) {
        console.error(`Failed to index ${name}:`, err);
      }
    }

    return { deposits: allDeposits, withdrawals: allWithdrawals };
  }

  /**
   * Parse a transaction to extract CT Deposit or Withdraw
   */
  private async parseTransaction(
    signature: string,
    expectedMint: string,
  ): Promise<{
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

      // Look through all instructions (including inner)
      const allInstructions = [
        ...((tx.transaction.message as any).instructions || []),
        ...(tx.meta.innerInstructions?.flatMap((i: any) => i.instructions) ||
          []),
      ];

      for (const ix of allInstructions) {
        const programId = ix.programId?.toString();
        if (programId !== TOKEN_2022_PROGRAM_ID) continue;

        const parsed = ix.parsed;
        if (!parsed) continue;

        // Check for CT Deposit
        if (
          parsed.type === "depositIntoConfidentialTransferExtension" ||
          parsed.type === "confidentialTransferDeposit" ||
          parsed.type === "deposit" // Sometimes just called "deposit"
        ) {
          const info = parsed.info || {};

          // Verify it's for the expected mint or extract from tx
          const mint = info.mint || this.extractMint(tx) || expectedMint;

          if (info.amount !== undefined) {
            return {
              type: "deposit",
              deposit: {
                signature,
                timestamp,
                slot,
                mint,
                owner: info.authority || info.owner || this.extractOwner(tx),
                tokenAccount: info.account || info.source || "unknown",
                amount: parseInt(info.amount) || 0,
                decimals: this.extractDecimals(tx, mint),
              },
            };
          }
        }

        // Check for CT Withdraw
        if (
          parsed.type === "withdrawFromConfidentialTransferExtension" ||
          parsed.type === "confidentialTransferWithdraw" ||
          parsed.type === "withdraw" // Sometimes just called "withdraw"
        ) {
          const info = parsed.info || {};

          const mint = info.mint || this.extractMint(tx) || expectedMint;

          if (info.amount !== undefined) {
            return {
              type: "withdraw",
              withdraw: {
                signature,
                timestamp,
                slot,
                mint,
                owner: info.authority || info.owner || this.extractOwner(tx),
                tokenAccount: info.account || info.destination || "unknown",
                amount: parseInt(info.amount) || 0,
                decimals: this.extractDecimals(tx, mint),
              },
            };
          }
        }
      }

      // Also check log messages for CT operations
      const logs = tx.meta.logMessages || [];
      for (const log of logs) {
        if (
          log.includes("ConfidentialTransfer") ||
          log.includes("confidential_transfer")
        ) {
          // This is a CT-related transaction, try to parse from token balances
          return this.parseFromBalanceChanges(
            tx,
            signature,
            timestamp,
            slot,
            expectedMint,
          );
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse CT operations from balance changes when instruction parsing fails
   */
  private parseFromBalanceChanges(
    tx: any,
    signature: string,
    timestamp: number,
    slot: number,
    mint: string,
  ): {
    type: "deposit" | "withdraw" | null;
    deposit?: CTDeposit;
    withdraw?: CTWithdraw;
  } | null {
    const preBalances = tx.meta?.preTokenBalances || [];
    const postBalances = tx.meta?.postTokenBalances || [];

    // Look for balance changes in CT-enabled tokens
    for (const post of postBalances) {
      if (post.mint !== mint) continue;

      const pre = preBalances.find(
        (p: any) => p.accountIndex === post.accountIndex && p.mint === mint,
      );

      const preAmount = pre?.uiTokenAmount?.amount
        ? parseInt(pre.uiTokenAmount.amount)
        : 0;
      const postAmount = post.uiTokenAmount?.amount
        ? parseInt(post.uiTokenAmount.amount)
        : 0;
      const diff = postAmount - preAmount;

      if (diff > 0) {
        // Deposit (balance increased)
        return {
          type: "deposit",
          deposit: {
            signature,
            timestamp,
            slot,
            mint,
            owner: post.owner || "unknown",
            tokenAccount:
              tx.transaction.message.accountKeys?.[
                post.accountIndex
              ]?.pubkey?.toString() || "unknown",
            amount: diff,
            decimals: post.uiTokenAmount?.decimals || 6,
          },
        };
      } else if (diff < 0) {
        // Withdraw (balance decreased)
        return {
          type: "withdraw",
          withdraw: {
            signature,
            timestamp,
            slot,
            mint,
            owner: post.owner || "unknown",
            tokenAccount:
              tx.transaction.message.accountKeys?.[
                post.accountIndex
              ]?.pubkey?.toString() || "unknown",
            amount: Math.abs(diff),
            decimals: post.uiTokenAmount?.decimals || 6,
          },
        };
      }
    }

    return null;
  }

  private extractMint(tx: any): string {
    const balances = tx.meta?.postTokenBalances || [];
    if (balances.length > 0) {
      return balances[0].mint || "unknown";
    }
    return "unknown";
  }

  private extractOwner(tx: any): string {
    const balances = tx.meta?.postTokenBalances || [];
    if (balances.length > 0) {
      return balances[0].owner || "unknown";
    }
    return "unknown";
  }

  private extractDecimals(tx: any, mint: string): number {
    const balances = tx.meta?.postTokenBalances || [];
    for (const b of balances) {
      if (b.mint === mint && b.uiTokenAmount?.decimals !== undefined) {
        return b.uiTokenAmount.decimals;
      }
    }
    return 6; // Default for PYUSD
  }
}

// CLI entry point
if (require.main === module) {
  const main = async () => {
    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) {
      console.error("HELIUS_API_KEY environment variable required");
      process.exit(1);
    }

    console.log("=== Confidential Transfers Indexer V2 ===\n");
    console.log("Targeting known CT-enabled mints (PYUSD, etc.)");
    console.log("KEY INSIGHT: Deposit and Withdraw have PUBLIC amounts!\n");

    const indexer = new CTIndexerV2(apiKey);
    const { deposits, withdrawals } = await indexer.fetchAllCTTransactions(300);

    console.log("\n=== RESULTS ===");
    console.log(`CT Deposits: ${deposits.length}`);
    console.log(`CT Withdrawals: ${withdrawals.length}`);

    if (deposits.length > 0) {
      console.log("\nSample Deposits:");
      for (const d of deposits.slice(0, 5)) {
        console.log(
          `  ${d.signature.slice(0, 20)}... | ${d.amount} | ${d.mint.slice(0, 10)}...`,
        );
      }
    }

    if (withdrawals.length > 0) {
      console.log("\nSample Withdrawals:");
      for (const w of withdrawals.slice(0, 5)) {
        console.log(
          `  ${w.signature.slice(0, 20)}... | ${w.amount} | ${w.mint.slice(0, 10)}...`,
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
        console.log(`Saved ${deposits.length} CT deposits`);
      }

      if (withdrawals.length > 0) {
        db.insertCTWithdrawals(withdrawals);
        console.log(`Saved ${withdrawals.length} CT withdrawals`);
      }

      db.close();
    }

    // Look for matches
    if (deposits.length > 0 && withdrawals.length > 0) {
      console.log("\nLooking for amount matches (attack vector)...");

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
                `  MATCH: ${deposit.amount} | ${timeDelta.toFixed(1)} min apart`,
              );
            }
          }
        }
      }

      if (matchCount > 0) {
        console.log(`\nVULNERABILITY: Found ${matchCount} amount matches!`);
      }
    }
  };

  main().catch(console.error);
}
