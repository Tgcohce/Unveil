/**
 * SilentSwap Indexer
 *
 * SilentSwap is a cross-chain privacy routing service that:
 * - Routes funds through Secret Network + TEE for privacy
 * - Uses relay.link or deBridge for bridging
 * - Creates one-time HD facilitator wallets for each swap
 * - Charges 1% fee, completes in 30 sec - 3 min
 *
 * $5K Bounty Target
 *
 * Attack Strategy:
 * 1. Timing Correlation: Match deposits to relay address with withdrawals
 * 2. Amount Matching: Input - 1% fee = Output (very precise fingerprint)
 * 3. Multi-Output Fingerprinting: Unique split patterns are identifiable
 *
 * The relay address on Solana is: CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr
 */

import dotenv from "dotenv";
dotenv.config();

import { Helius } from "helius-sdk";
import { PublicKey } from "@solana/web3.js";
import {
  SilentSwapInput,
  SilentSwapOutput,
  SilentSwapAccount,
  SILENTSWAP_RELAY_ADDRESS,
  SILENTSWAP_LAUNCH_DATE,
} from "./types";
import { UnveilEventBus } from "./event-bus";

// SilentSwap Solana relay address
const RELAY_ADDRESS = new PublicKey(SILENTSWAP_RELAY_ADDRESS);

// Known facilitator patterns - these are HD wallet derived addresses
// They typically have very short lifespans (used once then abandoned)
const FACILITATOR_DETECTION_PATTERNS = {
  // New wallets that immediately receive funds and then send them
  minAgeHours: 0, // Facilitators are usually brand new
  maxAgeHours: 24, // Rarely used after 24 hours
  typicalTxCount: 2, // Usually just: receive -> send
};

export class SilentSwapIndexer {
  private helius: Helius;
  private eventBus?: UnveilEventBus;

  constructor(heliusApiKey: string, eventBus?: UnveilEventBus) {
    this.helius = new Helius(heliusApiKey);
    this.eventBus = eventBus;
  }

  /**
   * Fetch transactions TO the SilentSwap relay address (inputs/deposits)
   *
   * These are users sending funds to SilentSwap for swapping.
   * The user_wallet is the source, facilitator_wallet is derived from the relay.
   */
  async fetchInputs(
    limit: number = 1000,
    beforeSignature?: string,
  ): Promise<SilentSwapInput[]> {
    console.log(`Fetching up to ${limit} SilentSwap input transactions...`);

    try {
      // Get transactions involving the relay address
      const transactions = await this.helius.connection.getSignaturesForAddress(
        RELAY_ADDRESS,
        {
          limit,
          before: beforeSignature,
        },
      );

      console.log(`Fetched ${transactions.length} signatures, parsing...`);

      const inputs: SilentSwapInput[] = [];

      // Batch processing
      const BATCH_SIZE = 3;
      const DELAY_MS = 2000;

      for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batch = transactions.slice(i, i + BATCH_SIZE);

        console.log(
          `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(transactions.length / BATCH_SIZE)}...`,
        );

        const batchPromises = batch.map(async (txSig) => {
          try {
            const tx = await this.helius.connection.getParsedTransaction(
              txSig.signature,
              {
                maxSupportedTransactionVersion: 0,
              },
            );

            if (!tx || !tx.meta || tx.meta.err) return null;

            return this.parseAsInput(tx, txSig.signature);
          } catch (err) {
            console.error(`Error parsing transaction ${txSig.signature}:`, err);
            return null;
          }
        });

        const results = await Promise.all(batchPromises);

        for (const parsed of results) {
          if (parsed) {
            inputs.push(parsed);
          }
        }

        // Delay between batches
        if (i + BATCH_SIZE < transactions.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }

      console.log(`Found ${inputs.length} SilentSwap inputs`);
      return inputs;
    } catch (error) {
      console.error("Error fetching SilentSwap inputs:", error);
      throw error;
    }
  }

  /**
   * Parse a transaction as a SilentSwap input (user -> relay)
   *
   * We're looking for:
   * - SOL transfers TO the relay address
   * - The sender is the user wallet
   * - The relay acts as intermediary to a facilitator
   */
  private parseAsInput(tx: any, signature: string): SilentSwapInput | null {
    try {
      const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now();

      // Skip pre-launch transactions (test/dust activity before official Solana support)
      if (timestamp < SILENTSWAP_LAUNCH_DATE) return null;

      const accountKeys = tx.transaction.message.accountKeys || [];
      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];

      // Find the relay address in the transaction
      const relayIndex = accountKeys.findIndex(
        (key: any) => key.pubkey?.toString() === SILENTSWAP_RELAY_ADDRESS,
      );

      if (relayIndex === -1) {
        return null;
      }

      // Check if relay received funds (this is an input)
      const relayBalanceChange =
        postBalances[relayIndex] - preBalances[relayIndex];

      if (relayBalanceChange <= 0) {
        // Relay didn't receive funds, this might be an output
        return null;
      }

      // Find the user (sender) - account that lost the most SOL
      let userWallet = "unknown";
      let maxDecrease = 0;

      accountKeys.forEach((key: any, idx: number) => {
        const change = preBalances[idx] - postBalances[idx];
        if (change > maxDecrease && idx !== relayIndex) {
          maxDecrease = change;
          userWallet = key.pubkey?.toString() || "unknown";
        }
      });

      // The facilitator wallet is typically derived from the relay
      // For now, we use the relay address as the facilitator
      // In practice, we'd need to track the subsequent output to find the real facilitator
      const facilitatorWallet = SILENTSWAP_RELAY_ADDRESS;

      // Determine bridge provider from logs or instruction data
      const logs = tx.meta?.logMessages || [];
      let bridgeProvider: "relay.link" | "debridge" | "unknown" = "unknown";

      for (const log of logs) {
        if (log.includes("relay.link") || log.includes("relay")) {
          bridgeProvider = "relay.link";
          break;
        }
        if (log.includes("debridge") || log.includes("deBridge")) {
          bridgeProvider = "debridge";
          break;
        }
      }

      return {
        signature,
        timestamp,
        userWallet,
        facilitatorWallet,
        amount: relayBalanceChange,
        token: "SOL",
        bridgeProvider,
      };
    } catch (error) {
      console.error(`Error parsing SilentSwap input ${signature}:`, error);
      return null;
    }
  }

  /**
   * Fetch transactions FROM the SilentSwap relay address (outputs/withdrawals)
   *
   * These are funds being sent from the relay to destination wallets.
   * The facilitator_wallet is the relay, destination_wallet is the recipient.
   */
  async fetchOutputs(
    limit: number = 1000,
    beforeSignature?: string,
  ): Promise<SilentSwapOutput[]> {
    console.log(`Fetching up to ${limit} SilentSwap output transactions...`);

    try {
      // Get transactions involving the relay address
      const transactions = await this.helius.connection.getSignaturesForAddress(
        RELAY_ADDRESS,
        {
          limit,
          before: beforeSignature,
        },
      );

      console.log(`Fetched ${transactions.length} signatures, parsing...`);

      const outputs: SilentSwapOutput[] = [];

      // Batch processing
      const BATCH_SIZE = 3;
      const DELAY_MS = 2000;

      for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batch = transactions.slice(i, i + BATCH_SIZE);

        console.log(
          `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(transactions.length / BATCH_SIZE)}...`,
        );

        const batchPromises = batch.map(async (txSig) => {
          try {
            const tx = await this.helius.connection.getParsedTransaction(
              txSig.signature,
              {
                maxSupportedTransactionVersion: 0,
              },
            );

            if (!tx || !tx.meta || tx.meta.err) return null;

            return this.parseAsOutput(tx, txSig.signature);
          } catch (err) {
            console.error(`Error parsing transaction ${txSig.signature}:`, err);
            return null;
          }
        });

        const results = await Promise.all(batchPromises);

        for (const parsed of results) {
          if (parsed) {
            outputs.push(parsed);
          }
        }

        // Delay between batches
        if (i + BATCH_SIZE < transactions.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }

      console.log(`Found ${outputs.length} SilentSwap outputs`);
      return outputs;
    } catch (error) {
      console.error("Error fetching SilentSwap outputs:", error);
      throw error;
    }
  }

  /**
   * Parse a transaction as a SilentSwap output (relay -> user)
   *
   * We're looking for:
   * - SOL transfers FROM the relay address
   * - The recipient is the destination wallet
   */
  private parseAsOutput(tx: any, signature: string): SilentSwapOutput | null {
    try {
      const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now();

      // Skip pre-launch transactions (test/dust activity before official Solana support)
      if (timestamp < SILENTSWAP_LAUNCH_DATE) return null;

      const accountKeys = tx.transaction.message.accountKeys || [];
      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];

      // Find the relay address in the transaction
      const relayIndex = accountKeys.findIndex(
        (key: any) => key.pubkey?.toString() === SILENTSWAP_RELAY_ADDRESS,
      );

      if (relayIndex === -1) {
        return null;
      }

      // Check if relay sent funds (this is an output)
      const relayBalanceChange =
        postBalances[relayIndex] - preBalances[relayIndex];

      if (relayBalanceChange >= 0) {
        // Relay didn't send funds, this is an input not output
        return null;
      }

      // Find the destination (recipient) - account that gained the most SOL
      let destinationWallet = "unknown";
      let maxIncrease = 0;

      accountKeys.forEach((key: any, idx: number) => {
        const change = postBalances[idx] - preBalances[idx];
        if (change > maxIncrease && idx !== relayIndex) {
          maxIncrease = change;
          destinationWallet = key.pubkey?.toString() || "unknown";
        }
      });

      // The facilitator wallet is the relay address
      const facilitatorWallet = SILENTSWAP_RELAY_ADDRESS;

      // Amount sent (absolute value)
      const amount = Math.abs(relayBalanceChange);

      // Determine bridge provider from logs
      const logs = tx.meta?.logMessages || [];
      let bridgeProvider: "relay.link" | "debridge" | "unknown" = "unknown";

      for (const log of logs) {
        if (log.includes("relay.link") || log.includes("relay")) {
          bridgeProvider = "relay.link";
          break;
        }
        if (log.includes("debridge") || log.includes("deBridge")) {
          bridgeProvider = "debridge";
          break;
        }
      }

      return {
        signature,
        timestamp,
        facilitatorWallet,
        destinationWallet,
        amount,
        token: "SOL",
        bridgeProvider,
      };
    } catch (error) {
      console.error(`Error parsing SilentSwap output ${signature}:`, error);
      return null;
    }
  }

  /**
   * Fetch all transactions and separate into inputs and outputs
   *
   * This is more efficient than fetching twice.
   */
  async fetchAllTransactions(
    limit: number = 1000,
  ): Promise<{ inputs: SilentSwapInput[]; outputs: SilentSwapOutput[] }> {
    console.log(`Fetching up to ${limit} SilentSwap transactions...`);

    try {
      const transactions = await this.helius.connection.getSignaturesForAddress(
        RELAY_ADDRESS,
        { limit },
      );

      console.log(`Fetched ${transactions.length} signatures, parsing...`);

      const inputs: SilentSwapInput[] = [];
      const outputs: SilentSwapOutput[] = [];

      // Sequential fetching to respect Helius free tier rate limits
      for (let i = 0; i < transactions.length; i++) {
        const txSig = transactions[i];

        if (i % 10 === 0) {
          console.log(`Processing ${i + 1}/${transactions.length}...`);
        }

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const tx = await this.helius.connection.getParsedTransaction(
              txSig.signature,
              {
                maxSupportedTransactionVersion: 0,
              },
            );

            if (tx && tx.meta && !tx.meta.err) {
              const input = this.parseAsInput(tx, txSig.signature);
              const output = this.parseAsOutput(tx, txSig.signature);

              if (input) {
                inputs.push(input);
                if (this.eventBus) {
                  this.eventBus.emit("silentswap:input", input);
                }
              }
              if (output) {
                outputs.push(output);
                if (this.eventBus) {
                  this.eventBus.emit("silentswap:output", output);
                }
              }
            }
            break;
          } catch (err: any) {
            const is429 = err?.message?.includes("429") || err?.message?.includes("rate") || err?.message?.includes("Too Many");
            if (is429 && attempt < 2) {
              const backoff = 2000 * Math.pow(2, attempt);
              console.log(`   ⏳ Rate limited, retry ${attempt + 1}/3 in ${backoff / 1000}s...`);
              await new Promise((r) => setTimeout(r, backoff));
              continue;
            }
            console.error(`Error parsing transaction ${txSig.signature}:`, err);
            break;
          }
        }

        if (this.eventBus && i % 10 === 0) {
          this.eventBus.emit("indexer:status", {
            protocol: "SilentSwap",
            status: "indexing",
            progress: `${inputs.length + outputs.length}/${transactions.length}`,
          });
        }

        // Delay between each request
        if (i < transactions.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(
        `Found ${inputs.length} inputs and ${outputs.length} outputs`,
      );
      return { inputs, outputs };
    } catch (error) {
      console.error("Error fetching SilentSwap transactions:", error);
      throw error;
    }
  }

  /**
   * Aggregate account statistics from inputs and outputs
   */
  aggregateAccounts(
    inputs: SilentSwapInput[],
    outputs: SilentSwapOutput[],
  ): Map<string, SilentSwapAccount> {
    const accounts = new Map<string, SilentSwapAccount>();

    // Process inputs (user wallets)
    for (const input of inputs) {
      this.updateAccount(
        accounts,
        input.userWallet,
        "user",
        input.amount,
        input.timestamp,
        true,
      );
    }

    // Process outputs (destination wallets)
    for (const output of outputs) {
      this.updateAccount(
        accounts,
        output.destinationWallet,
        "user",
        output.amount,
        output.timestamp,
        false,
      );
    }

    // Mark facilitator wallets
    for (const input of inputs) {
      if (input.facilitatorWallet !== SILENTSWAP_RELAY_ADDRESS) {
        this.updateAccount(
          accounts,
          input.facilitatorWallet,
          "facilitator",
          input.amount,
          input.timestamp,
          true,
        );
      }
    }

    return accounts;
  }

  private updateAccount(
    accounts: Map<string, SilentSwapAccount>,
    wallet: string,
    walletType: "user" | "facilitator",
    amount: number,
    timestamp: number,
    isInput: boolean,
  ) {
    if (wallet === "unknown") return;

    const existing = accounts.get(wallet) || {
      wallet,
      walletType,
      totalInputs: 0,
      totalOutputs: 0,
      totalVolume: 0,
      firstSeen: timestamp,
      lastSeen: timestamp,
    };

    if (isInput) {
      existing.totalInputs++;
    } else {
      existing.totalOutputs++;
    }
    existing.totalVolume += amount;
    existing.firstSeen = Math.min(existing.firstSeen, timestamp);
    existing.lastSeen = Math.max(existing.lastSeen, timestamp);

    accounts.set(wallet, existing);
  }

  /**
   * Detect if a wallet is likely a one-time facilitator wallet
   *
   * Facilitator wallets typically:
   * - Are brand new (created just before the swap)
   * - Have only 1-2 transactions
   * - Are never used again
   */
  isFacilitatorWallet(account: SilentSwapAccount): boolean {
    const ageHours = (Date.now() - account.firstSeen) / (1000 * 60 * 60);
    const txCount = account.totalInputs + account.totalOutputs;

    return (
      txCount <= FACILITATOR_DETECTION_PATTERNS.typicalTxCount &&
      ageHours <= FACILITATOR_DETECTION_PATTERNS.maxAgeHours
    );
  }
}

// CLI entry point
if (require.main === module) {
  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    console.error("HELIUS_API_KEY environment variable required");
    process.exit(1);
  }

  const indexer = new SilentSwapIndexer(heliusApiKey);

  indexer.fetchAllTransactions(1000).then(async ({ inputs, outputs }) => {
    console.log("\n=== SilentSwap Indexing Results ===");
    console.log(`Total Inputs: ${inputs.length}`);
    console.log(`Total Outputs: ${outputs.length}`);

    if (inputs.length > 0) {
      console.log("\nSample Input:");
      console.log(JSON.stringify(inputs[0], null, 2));
    }

    if (outputs.length > 0) {
      console.log("\nSample Output:");
      console.log(JSON.stringify(outputs[0], null, 2));
    }

    // Save to database
    if (inputs.length > 0 || outputs.length > 0) {
      const { UnveilDatabase } = await import("./db");
      const dbPath = process.env.DATABASE_PATH || "./data/unveil_working.db";
      const db = new UnveilDatabase(dbPath);

      console.log("\nSaving to database...");

      if (inputs.length > 0) {
        db.insertSilentSwapInputs(inputs);
        console.log(`Saved ${inputs.length} inputs to database`);
      }

      if (outputs.length > 0) {
        db.insertSilentSwapOutputs(outputs);
        console.log(`Saved ${outputs.length} outputs to database`);
      }

      db.close();
      console.log("Database saved successfully!");
    }
  });
}
