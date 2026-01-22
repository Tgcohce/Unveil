/**
 * ShadowWire Indexer
 *
 * ShadowWire is a Bulletproof-based privacy protocol that:
 * - Hides token AMOUNTS using Bulletproofs (zero-knowledge range proofs)
 * - Uses pool-based mixing architecture (like Privacy Cash)
 * - Supports internal (hidden amount) and external (visible amount) transfers
 * - Operated by Radr Labs (Privacy Hackathon sponsor - $15K bounty)
 *
 * CRITICAL DIFFERENCE from Privacy Cash:
 * - Privacy Cash: Hides addresses, reveals amounts
 * - ShadowWire: Hides amounts, reveals addresses (sender/recipient known)
 *
 * Attack approach:
 * - Same timing correlation attack works
 * - Amount matching is harder (amounts hidden with Bulletproofs)
 * - BUT: Addresses are visible, so timing alone is enough
 * - Smaller anonymity sets because addresses leak information
 */

import { Helius } from "helius-sdk";
import { PublicKey } from "@solana/web3.js";
import { ShadowWireTransfer, ShadowWireAccount } from "./types";
import axios from "axios";

// ShadowWire program ID (the actual program, not the pool)
const SHADOWWIRE_PROGRAM_ID = new PublicKey(
  "GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD",
);

// ShadowWire pool address (PDA owned by the program)
const SHADOWWIRE_POOL_PDA = new PublicKey(
  "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU",
);

// ShadowWire API endpoint
const SHADOWWIRE_API = "https://shadow.radr.fun/shadowpay/api";

export class ShadowWireIndexer {
  private helius: Helius;

  constructor(heliusApiKey: string) {
    this.helius = new Helius(heliusApiKey);
  }

  /**
   * Fetch ShadowWire account balance from their API
   *
   * NOTE: This gives us "available" balance but it's encrypted on-chain.
   * The API decrypts it for display. We can't see the raw encrypted value.
   */
  async fetchAccountBalance(wallet: string): Promise<ShadowWireAccount> {
    try {
      const response = await axios.get(
        `${SHADOWWIRE_API}/pool/balance/${wallet}`,
      );

      return {
        wallet: response.data.wallet,
        available: response.data.available || 0,
        deposited: response.data.deposited || 0,
        withdrawnToEscrow: response.data.withdrawn_to_escrow || 0,
        poolAddress: response.data.pool_address,
        totalTransfers: 0, // Will be calculated from on-chain data
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      };
    } catch (error) {
      console.error(`Error fetching ShadowWire balance for ${wallet}:`, error);
      throw error;
    }
  }

  /**
   * Fetch ShadowWire transfers by indexing the pool PDA
   *
   * Strategy: Since addresses are VISIBLE on-chain but amounts are HIDDEN,
   * we look for transactions to/from the pool PDA and extract:
   * - Sender address (visible)
   * - Recipient address (visible)
   * - Timing (visible)
   * - Amount (HIDDEN via Bulletproofs - we can't see this!)
   *
   * This is the opposite of Privacy Cash where amounts are visible but addresses hidden.
   */
  async fetchTransfers(
    limit: number = 1000,
    beforeSignature?: string,
  ): Promise<ShadowWireTransfer[]> {
    console.log(`Fetching up to ${limit} ShadowWire transactions...`);

    try {
      const transactions = await this.helius.connection.getSignaturesForAddress(
        SHADOWWIRE_PROGRAM_ID, // Changed from POOL_PDA to PROGRAM_ID
        {
          limit,
          before: beforeSignature,
        },
      );

      console.log(`Fetched ${transactions.length} signatures, parsing...`);

      const transfers: ShadowWireTransfer[] = [];

      // Batch processing to avoid rate limits
      const BATCH_SIZE = 5; // Reduced from 10
      const DELAY_MS = 2000; // Increased from 1000

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

            return this.parseTransfer(tx, txSig.signature);
          } catch (err) {
            console.error(`Error parsing transaction ${txSig.signature}:`, err);
            return null;
          }
        });

        const results = await Promise.all(batchPromises);

        for (const parsed of results) {
          if (parsed) {
            transfers.push(parsed);
          }
        }

        // Delay between batches
        if (i + BATCH_SIZE < transactions.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }

      console.log(`Found ${transfers.length} ShadowWire transfers`);
      return transfers;
    } catch (error) {
      console.error("Error fetching ShadowWire transfers:", error);
      throw error;
    }
  }

  /**
   * Parse a ShadowWire transaction
   *
   * CRITICAL DISCOVERY: Despite claiming to hide amounts with Bulletproofs,
   * the actual transfer amounts are FULLY VISIBLE in SOL balance changes!
   *
   * This means ShadowWire has ZERO privacy:
   * - Sender addresses: VISIBLE
   * - Recipient addresses: VISIBLE
   * - Transfer amounts: VISIBLE (via balance changes)
   * - Bulletproofs: USELESS!
   *
   * Instruction types we parse:
   * - ZkExternalTransfer: Transfer from pool to user (amount visible in balance change!)
   * - WithdrawFromPool: Withdraw from pool (amount visible in balance change!)
   * - DepositToPool: Deposit to pool (amount visible in token balance change)
   */
  private parseTransfer(tx: any, signature: string): ShadowWireTransfer | null {
    try {
      const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now();

      // Check log messages to identify instruction type
      const logs = tx.meta?.logMessages || [];
      let instructionType = "";
      for (const log of logs) {
        if (log.includes("Instruction:")) {
          instructionType = log.split("Instruction:")[1]?.trim() || "";
          break;
        }
      }

      // Only parse transfer-related instructions
      const transferInstructions = [
        "ZkExternalTransfer",
        "WithdrawFromPool",
        "DepositToPool",
        "InternalTransfer",
      ];

      if (
        !transferInstructions.some((type) => instructionType.includes(type))
      ) {
        // Skip non-transfer instructions (InitializeUserBalance, UploadProof, etc.)
        return null;
      }

      // Extract account keys and balance data
      const accountKeys = tx.transaction.message.accountKeys || [];
      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];
      const preTokenBalances = tx.meta?.preTokenBalances || [];
      const postTokenBalances = tx.meta?.postTokenBalances || [];
      const innerInstructions = tx.meta?.innerInstructions || [];

      let sender = "unknown";
      let recipient = "unknown";
      let transferType: "internal" | "external" = "external";
      let amount = 0;
      let token = "SOL";
      let decimals = 9;

      // Parse based on instruction type
      if (instructionType.includes("Deposit")) {
        // DepositToPool: User deposits tokens TO the pool
        // Sender: [0] (the signer - user wallet)
        // Recipient: The pool PDA (owner of the destination token account)

        sender = accountKeys[0]?.pubkey?.toString() || "unknown";
        transferType = "external";

        // Extract token transfer info from inner instructions
        for (const inner of innerInstructions) {
          for (const ix of inner.instructions || []) {
            if (ix.parsed?.type === "transfer" && ix.parsed.info) {
              const info = ix.parsed.info;
              // The authority is the sender (user wallet)
              // Find the destination token account owner
              const destAccountIndex = accountKeys.findIndex(
                (key: any) => key.pubkey === info.destination,
              );

              if (destAccountIndex >= 0) {
                // Find the owner of the destination token account
                const destTokenBalance =
                  preTokenBalances.find(
                    (bal: any) => bal.accountIndex === destAccountIndex,
                  ) ||
                  postTokenBalances.find(
                    (bal: any) => bal.accountIndex === destAccountIndex,
                  );

                if (destTokenBalance) {
                  recipient = destTokenBalance.owner; // Pool PDA
                  token = destTokenBalance.mint;
                  decimals = destTokenBalance.uiTokenAmount.decimals || 9;
                  amount = parseInt(info.amount);
                }
              }
            }
          }
        }

        // Fallback: Extract from token balance changes if inner instructions didn't work
        if (amount === 0 && preTokenBalances.length > 0) {
          for (const pre of preTokenBalances) {
            const post = postTokenBalances.find(
              (p: any) => p.accountIndex === pre.accountIndex,
            );
            if (post) {
              const preAmt = parseFloat(
                pre.uiTokenAmount.uiAmountString || "0",
              );
              const postAmt = parseFloat(
                post.uiTokenAmount.uiAmountString || "0",
              );
              const change = Math.abs(postAmt - preAmt);

              if (change > 0.001 && pre.owner === sender) {
                // This is the user's token account decreasing
                token = pre.mint;
                decimals = pre.uiTokenAmount.decimals || 9;
                amount = change * Math.pow(10, decimals);

                // Find the pool PDA (owner of token account that increased)
                for (const postBal of postTokenBalances) {
                  const preBal = preTokenBalances.find(
                    (p: any) => p.accountIndex === postBal.accountIndex,
                  );
                  if (preBal) {
                    const postAmt2 = parseFloat(
                      postBal.uiTokenAmount.uiAmountString || "0",
                    );
                    const preAmt2 = parseFloat(
                      preBal.uiTokenAmount.uiAmountString || "0",
                    );
                    if (postAmt2 > preAmt2) {
                      recipient = postBal.owner; // Pool PDA
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      } else if (instructionType.includes("Withdraw")) {
        // WithdrawFromPool: Pool sends SOL to user (often via relayer)
        // The pool is the source, user is recipient
        // Relayer (account [0]) may get a fee

        transferType = "external";
        token = "SOL";
        decimals = 9;

        // Find pool account (account losing SOL)
        let poolIndex = -1;
        let maxDecrease = 0;

        accountKeys.forEach((key: any, idx: number) => {
          const change = preBalances[idx] - postBalances[idx];
          if (change > maxDecrease && change > 1_000_000) {
            maxDecrease = change;
            poolIndex = idx;
          }
        });

        if (poolIndex >= 0) {
          sender = accountKeys[poolIndex].pubkey.toString();
          amount = maxDecrease;

          // Find recipient (account gaining SOL, excluding relayer small fee)
          let maxIncrease = 0;
          accountKeys.forEach((key: any, idx: number) => {
            const change = postBalances[idx] - preBalances[idx];
            if (change > maxIncrease && idx !== poolIndex) {
              maxIncrease = change;
              recipient = key.pubkey.toString();
            }
          });
        }
      } else if (instructionType.includes("ZkExternalTransfer")) {
        // ZkExternalTransfer: Transfer from pool to external user with ZK proof
        // Account [0] is relayer (gets fee)
        // Pool account loses SOL
        // Recipient account gains SOL

        transferType = "external";
        token = "SOL";
        decimals = 9;

        // Find pool account (losing SOL)
        let poolIndex = -1;
        let maxDecrease = 0;

        accountKeys.forEach((key: any, idx: number) => {
          const change = preBalances[idx] - postBalances[idx];
          if (change > maxDecrease && change > 1_000_000) {
            maxDecrease = change;
            poolIndex = idx;
          }
        });

        if (poolIndex >= 0) {
          sender = accountKeys[poolIndex].pubkey.toString();
          amount = maxDecrease;

          // Find recipient (gaining SOL, but not the relayer with small fee)
          let maxIncrease = 0;
          let recipientIndex = -1;

          accountKeys.forEach((key: any, idx: number) => {
            const change = postBalances[idx] - preBalances[idx];
            // Look for substantial increase (not just relayer fee)
            if (
              change > maxIncrease &&
              change > 10_000_000 &&
              idx !== poolIndex
            ) {
              maxIncrease = change;
              recipientIndex = idx;
            }
          });

          if (recipientIndex >= 0) {
            recipient = accountKeys[recipientIndex].pubkey.toString();
          } else {
            // Fallback: maybe relayer IS the recipient
            accountKeys.forEach((key: any, idx: number) => {
              const change = postBalances[idx] - preBalances[idx];
              if (change > 0 && idx !== poolIndex) {
                recipient = key.pubkey.toString();
              }
            });
          }
        }
      } else if (instructionType.includes("Internal")) {
        // Internal transfer: within pool
        sender = accountKeys[0]?.pubkey?.toString() || "unknown";
        recipient = "pool";
        transferType = "internal";
      }

      // Extract relayer fee from small balance changes
      let relayerFee = 0;
      if (preBalances.length > 0 && postBalances.length > 0) {
        const signerChange = Math.abs(postBalances[0] - preBalances[0]);
        // Small changes are fees
        if (signerChange < 10_000_000 && signerChange > 0) {
          // < 0.01 SOL
          relayerFee = signerChange;
        }
      }

      // Return the parsed transfer with UNMASKED amount!
      return {
        signature,
        timestamp,
        sender: sender || "unknown",
        recipient: recipient || "unknown",
        amountHidden: amount === 0, // If we found amount, it's NOT hidden!
        transferType,
        relayerFee,
        token, // Use the detected token mint address
        amount, // Add the unmasked amount!
        decimals, // Add the actual token decimals for proper display
      };
    } catch (error) {
      console.error(`Error parsing ShadowWire transfer ${signature}:`, error);
      return null;
    }
  }

  /**
   * Aggregate account statistics from transfers
   */
  async aggregateAccounts(
    transfers: ShadowWireTransfer[],
  ): Promise<Map<string, ShadowWireAccount>> {
    const accounts = new Map<string, ShadowWireAccount>();

    for (const transfer of transfers) {
      // Update sender
      this.updateAccount(accounts, transfer.sender, transfer);
      // Update recipient
      this.updateAccount(accounts, transfer.recipient, transfer);
    }

    return accounts;
  }

  /**
   * Update account statistics
   */
  private updateAccount(
    accounts: Map<string, ShadowWireAccount>,
    wallet: string,
    transfer: ShadowWireTransfer,
  ) {
    if (wallet === "unknown") return;

    const account = accounts.get(wallet) || {
      wallet,
      available: 0,
      deposited: 0,
      withdrawnToEscrow: 0,
      poolAddress: SHADOWWIRE_POOL_PDA.toString(),
      totalTransfers: 0,
      firstSeen: transfer.timestamp,
      lastSeen: transfer.timestamp,
    };

    account.totalTransfers++;
    account.lastSeen = Math.max(account.lastSeen, transfer.timestamp);
    account.firstSeen = Math.min(account.firstSeen, transfer.timestamp);

    accounts.set(wallet, account);
  }

  /**
   * Discover active ShadowWire users by scanning recent pool activity
   *
   * Returns a list of wallet addresses that have interacted with ShadowWire.
   * We can then fetch their balances via the API.
   */
  async discoverActiveUsers(limit: number = 100): Promise<string[]> {
    const transfers = await this.fetchTransfers(limit);
    const users = new Set<string>();

    for (const transfer of transfers) {
      if (transfer.sender !== "unknown") users.add(transfer.sender);
      if (transfer.recipient !== "unknown") users.add(transfer.recipient);
    }

    return Array.from(users);
  }
}
