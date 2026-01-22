/**
 * Helius API client for fetching Solana transaction data
 */

import { Helius } from "helius-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { ParsedTransaction } from "./types";

export class HeliusClient {
  private helius: Helius;
  private connection: Connection;

  constructor(apiKey: string) {
    this.helius = new Helius(apiKey);
    this.connection = new Connection(this.helius.connection.rpcEndpoint);
  }

  /**
   * Fetch transaction signatures for a program address
   * @param programId Program public key
   * @param limit Number of signatures to fetch (max 1000)
   * @param before Pagination cursor (signature to start before)
   */
  async getSignaturesForAddress(
    programId: string,
    limit: number = 1000,
    before?: string,
  ): Promise<
    Array<{ signature: string; slot: number; blockTime: number | null }>
  > {
    try {
      const pubkey = new PublicKey(programId);
      const signatures = await this.connection.getSignaturesForAddress(pubkey, {
        limit,
        before,
      });

      return signatures.map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime ?? null,
      }));
    } catch (error) {
      console.error("Error fetching signatures:", error);
      throw error;
    }
  }

  /**
   * Fetch and parse a single transaction
   * @param signature Transaction signature
   */
  async getTransaction(signature: string): Promise<ParsedTransaction | null> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (!tx || !tx.blockTime) {
        return null;
      }

      const instructions = tx.transaction.message.compiledInstructions
        .map((instr) => {
          const accountKeys = tx.transaction.message.staticAccountKeys;
          const programId = accountKeys[instr.programIdIndex];

          if (!programId) {
            return null;
          }

          return {
            programId: programId.toBase58(),
            data: Buffer.from(instr.data),
            keys: instr.accountKeyIndexes
              .map((idx) => {
                const key = accountKeys[idx];
                if (!key) return null;
                return {
                  pubkey: key.toBase58(),
                  isSigner: tx.transaction.message.isAccountSigner(idx),
                  isWritable: tx.transaction.message.isAccountWritable(idx),
                };
              })
              .filter((k): k is NonNullable<typeof k> => k !== null),
          };
        })
        .filter((instr): instr is NonNullable<typeof instr> => instr !== null);

      return {
        signature,
        slot: tx.slot,
        timestamp: tx.blockTime * 1000, // Convert to milliseconds
        instructions,
        // Add balance change data for SOL flow analysis
        meta: tx.meta,
        accountKeys: tx.transaction.message.staticAccountKeys.map((key) =>
          key.toBase58(),
        ),
      };
    } catch (error) {
      console.error(`Error fetching transaction ${signature}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple transactions in parallel
   * @param signatures Array of transaction signatures
   * @param batchSize Number of concurrent requests
   */
  async getTransactions(
    signatures: string[],
    batchSize: number = 10,
  ): Promise<ParsedTransaction[]> {
    const results: ParsedTransaction[] = [];

    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const promises = batch.map((sig) => this.getTransaction(sig));
      const transactions = await Promise.all(promises);

      for (const tx of transactions) {
        if (tx) {
          results.push(tx);
        }
      }

      // Small delay to avoid rate limiting
      if (i + batchSize < signatures.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Get current slot
   */
  async getCurrentSlot(): Promise<number> {
    return await this.connection.getSlot();
  }

  /**
   * Check if API key is valid
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.connection.getSlot();
      return true;
    } catch (error) {
      console.error("Helius health check failed:", error);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
