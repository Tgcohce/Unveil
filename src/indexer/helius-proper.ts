/**
 * Proper Helius API client avoiding rate limits
 * Uses Helius SDK methods and proper error handling
 */

import { Helius } from "helius-sdk";
import { PublicKey } from "@solana/web3.js";
import { ParsedTransaction } from "./types";

export class HeliusClient {
  private helius: Helius;

  constructor(apiKey: string) {
    this.helius = new Helius(apiKey);
  }

  /**
   * Fetch transaction signatures for a program address using Helius connection
   */
  async getSignaturesForAddress(
    programId: string,
    limit: number = 1000,
    before?: string,
  ): Promise<
    Array<{ signature: string; slot: number; blockTime: number | null }>
  > {
    try {
      // Use the connection method with proper options
      const options: any = {
        limit,
      };

      if (before) {
        options.before = before;
      }

      // Use connection.getSignaturesForAddress
      const pubkey = new PublicKey(programId);
      const response = await this.helius.connection.getSignaturesForAddress(
        pubkey,
        options,
      );

      return response.map((sig: any) => ({
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
   * Fetch transaction details using Helius connection with proper error handling
   */
  async getTransaction(signature: string): Promise<ParsedTransaction | null> {
    try {
      // Use Helius connection with retry logic
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          const tx = await this.helius.connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
          });

          if (!tx || !tx.blockTime) {
            return null;
          }

          // Extract account keys and instructions safely
          let accountKeys: string[] = [];
          let instructions: any[] = [];

          try {
            if ("message" in tx.transaction) {
              const message = tx.transaction.message as any;

              // Get account keys
              if ("staticAccountKeys" in message) {
                accountKeys = message.staticAccountKeys.map((key: any) =>
                  key.toBase58(),
                );
              } else if ("accountKeys" in message) {
                accountKeys = message.accountKeys.map((key: any) =>
                  typeof key === "string" ? key : key.toBase58(),
                );
              }

              // Get instructions
              if ("compiledInstructions" in message) {
                instructions = message.compiledInstructions
                  .map((instr: any) => {
                    const programIdIndex = instr.programIdIndex;
                    const programId = accountKeys[programIdIndex];

                    if (!programId) return null;

                    return {
                      programId: programId,
                      data: Buffer.from(instr.data || []),
                      keys: instr.accountKeyIndexes.map((idx: number) => ({
                        pubkey: accountKeys[idx] || "",
                        isSigner: message.isAccountSigner
                          ? message.isAccountSigner(idx)
                          : false,
                        isWritable: message.isAccountWritable
                          ? message.isAccountWritable(idx)
                          : false,
                      })),
                    };
                  })
                  .filter(Boolean);
              } else if ("instructions" in message) {
                instructions = message.instructions.map((instr: any) => ({
                  programId:
                    typeof instr.programId === "string"
                      ? instr.programId
                      : instr.programId.toBase58(),
                  data: Buffer.from(instr.data || []),
                  keys: instr.keys.map((key: any) => ({
                    pubkey:
                      typeof key.pubkey === "string"
                        ? key.pubkey
                        : key.pubkey.toBase58(),
                    isSigner: key.isSigner,
                    isWritable: key.isWritable,
                  })),
                }));
              }
            }
          } catch (parseError: any) {
            console.warn(
              `   ⚠️  Parse error for ${signature}: ${parseError?.message || parseError}`,
            );
            return null;
          }

          return {
            signature,
            slot: tx.slot,
            timestamp: tx.blockTime * 1000, // Convert to milliseconds
            instructions,
            meta: tx.meta,
            accountKeys,
          };
        } catch (fetchError: any) {
          retries++;

          if (
            fetchError.message?.includes("429") ||
            fetchError.message?.includes("rate limited")
          ) {
            console.log(
              `   ⏳ Rate limited, retry ${retries}/${maxRetries}...`,
            );
            await this.delay(2000 * retries); // Exponential backoff
            continue;
          }

          throw fetchError;
        }
      }

      console.warn(`   ❌ Failed after ${maxRetries} retries for ${signature}`);
      return null;
    } catch (error) {
      console.error(`Error fetching transaction ${signature}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple transactions with careful rate limiting
   */
  async getTransactions(
    signatures: string[],
    batchSize: number = 2, // Very small batch size
  ): Promise<ParsedTransaction[]> {
    const results: ParsedTransaction[] = [];
    const totalBatches = Math.ceil(signatures.length / batchSize);

    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      console.log(
        `   📦 Batch ${batchNum}/${totalBatches} (${batch.length} txs)...`,
      );

      // Process sequentially with delays
      for (let j = 0; j < batch.length; j++) {
        const sig = batch[j];
        const itemNum = i + j + 1;

        console.log(
          `      🔍 ${itemNum}/${signatures.length}: ${sig.slice(0, 10)}...`,
        );

        try {
          const tx = await this.getTransaction(sig);
          if (tx) {
            results.push(tx);
            console.log(`         ✅ Parsed successfully`);
          } else {
            console.log(`         ❌ Could not parse`);
          }
        } catch (error: any) {
          console.log(`         ⚠️  Error: ${error.message}`);
        }

        // Delay between individual requests
        if (j < batch.length - 1 || i + batchSize < signatures.length) {
          await this.delay(1000); // 1 second between requests
        }
      }

      // Longer delay between batches
      if (i + batchSize < signatures.length) {
        console.log(`   ⏳ Batch delay 3 seconds...`);
        await this.delay(3000);
      }
    }

    console.log(
      `   ✅ Retrieved ${results.length}/${signatures.length} transactions`,
    );
    return results;
  }

  /**
   * Get current slot
   */
  async getCurrentSlot(): Promise<number> {
    try {
      return await this.helius.connection.getSlot();
    } catch (error) {
      console.error("Error getting slot:", error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.helius.connection.getSlot();
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
