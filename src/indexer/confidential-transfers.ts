/**
 * Confidential Transfers Indexer (Token-2022)
 *
 * Indexes Solana's native confidential transfer feature which:
 * - Hides token AMOUNTS using ElGamal encryption
 * - Does NOT hide sender/receiver addresses (major limitation!)
 * - Uses optional auditor keys for compliance
 *
 * We analyze:
 * 1. Address reuse patterns (defeats privacy if same address used repeatedly)
 * 2. Timing patterns (do users make CTs at predictable times?)
 * 3. Auditor centralization (single entity can decrypt all amounts)
 * 4. Public/confidential mixing (do users convert back quickly?)
 */

import { Helius } from "helius-sdk";
import { PublicKey } from "@solana/web3.js";
import {
  ConfidentialTransfer,
  ConfidentialAccount,
  ConfidentialMint,
} from "./types";

const TOKEN_2022_PROGRAM = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
);

export class ConfidentialTransferIndexer {
  private helius: Helius;

  constructor(heliusApiKey: string) {
    this.helius = new Helius(heliusApiKey);
  }

  /**
   * Fetch confidential transfer transactions
   *
   * Confidential Transfer instructions we look for:
   * - InitializeMint (sets up CT extension)
   * - ConfigureAccount (enables CT on token account)
   * - ApplyPendingBalance (applies encrypted transfer)
   * - Transfer (encrypted transfer)
   * - Withdraw (decrypt back to public)
   * - Deposit (encrypt public to confidential)
   */
  async fetchConfidentialTransfers(
    limit: number = 1000,
    beforeSignature?: string,
  ): Promise<ConfidentialTransfer[]> {
    console.log(`Fetching up to ${limit} Token-2022 transactions...`);

    try {
      const transactions = await this.helius.connection.getSignaturesForAddress(
        TOKEN_2022_PROGRAM,
        {
          limit,
          before: beforeSignature,
        },
      );

      console.log(`Fetched ${transactions.length} signatures, parsing...`);

      const confidentialTransfers: ConfidentialTransfer[] = [];

      // Fetch full transaction details in batches to avoid rate limits
      const BATCH_SIZE = 10;
      const DELAY_MS = 1000; // 1 second between batches

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

            return this.parseConfidentialTransfer(tx, txSig.signature);
          } catch (err) {
            console.error(`Error parsing transaction ${txSig.signature}:`, err);
            return null;
          }
        });

        const results = await Promise.all(batchPromises);

        for (const parsed of results) {
          if (parsed) {
            confidentialTransfers.push(parsed);
          }
        }

        // Delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < transactions.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }

      console.log(
        `Found ${confidentialTransfers.length} confidential transfers`,
      );
      return confidentialTransfers;
    } catch (error) {
      console.error("Error fetching confidential transfers:", error);
      throw error;
    }
  }

  /**
   * Parse a Token-2022 transaction to extract confidential transfer data
   */
  private parseConfidentialTransfer(
    tx: any,
    signature: string,
  ): ConfidentialTransfer | null {
    try {
      const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now();
      const slot = tx.slot;

      // Look through instructions for confidential transfer operations
      const instructions = tx.transaction.message.instructions || [];

      for (const ix of instructions) {
        // Check if this is a Token-2022 instruction
        if (ix.programId.toString() !== TOKEN_2022_PROGRAM) continue;

        // Parse instruction type
        const parsed = ix.parsed;
        if (!parsed || !parsed.type) continue;

        // Look for confidential transfer instructions
        const ctInstructions = [
          "Transfer",
          "ApplyPendingBalance",
          "Deposit",
          "Withdraw",
        ];

        if (!ctInstructions.includes(parsed.type)) continue;

        // Check if this is actually a confidential transfer
        // (Token-2022 also handles regular transfers)
        const info = parsed.info;
        if (!info || !this.isConfidentialTransfer(parsed, tx)) continue;

        // Extract account information
        const accounts = ix.accounts || [];
        const source = accounts[0]?.toString() || "unknown";
        const destination = accounts[1]?.toString() || "unknown";

        // Get mint from transaction
        const mint = this.extractMint(tx, source, destination);

        // Get owner addresses (THESE ARE VISIBLE - major privacy issue!)
        const { sourceOwner, destinationOwner } = this.extractOwners(
          tx,
          source,
          destination,
        );

        // Extract encrypted amount (we can't decrypt it, just store the ciphertext)
        const encryptedAmount = this.extractEncryptedAmount(ix);

        // Extract auditor key if present
        const auditorKey = this.extractAuditorKey(tx, mint);

        return {
          signature,
          timestamp,
          slot,
          mint,
          source,
          destination,
          sourceOwner,
          destinationOwner,
          encryptedAmount,
          auditorKey,
          instructionType: parsed.type as any,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error parsing confidential transfer ${signature}:`, error);
      return null;
    }
  }

  /**
   * Check if this is a confidential transfer (vs regular Token-2022 transfer)
   * Confidential transfers will have encrypted amount data
   */
  private isConfidentialTransfer(parsed: any, tx: any): boolean {
    // Look for encrypted amount in instruction data
    // Confidential transfers have additional data fields
    const info = parsed.info;

    // If there's an "encryptedAmount" field, it's confidential
    if (info.encryptedAmount) return true;

    // Check instruction data for CT markers
    const ix = tx.transaction.message.instructions.find(
      (i: any) => i.parsed?.type === parsed.type,
    );

    if (!ix) return false;

    // Confidential transfer instructions have larger data payloads
    // (ElGamal ciphertext is ~100+ bytes)
    if (ix.data && ix.data.length > 100) return true;

    return false;
  }

  /**
   * Extract token mint address
   */
  private extractMint(tx: any, source: string, destination: string): string {
    // Try to get mint from pre/post token balances
    const balances = tx.meta?.postTokenBalances || [];

    for (const balance of balances) {
      const accountIndex = balance.accountIndex;
      const account = tx.transaction.message.accountKeys[accountIndex];

      if (
        account?.toString() === source ||
        account?.toString() === destination
      ) {
        return balance.mint;
      }
    }

    return "unknown";
  }

  /**
   * Extract owner addresses (these are VISIBLE in CT - privacy issue!)
   */
  private extractOwners(
    tx: any,
    source: string,
    destination: string,
  ): { sourceOwner: string; destinationOwner: string } {
    const balances = tx.meta?.postTokenBalances || [];

    let sourceOwner = "unknown";
    let destinationOwner = "unknown";

    for (const balance of balances) {
      const accountIndex = balance.accountIndex;
      const account = tx.transaction.message.accountKeys[accountIndex];

      if (account?.toString() === source) {
        sourceOwner = balance.owner || "unknown";
      }
      if (account?.toString() === destination) {
        destinationOwner = balance.owner || "unknown";
      }
    }

    return { sourceOwner, destinationOwner };
  }

  /**
   * Extract encrypted amount (ElGamal ciphertext)
   * We can't decrypt it, but we can store it for analysis
   */
  private extractEncryptedAmount(ix: any): string {
    // ElGamal encrypted amount is in instruction data
    if (ix.parsed?.info?.encryptedAmount) {
      return JSON.stringify(ix.parsed.info.encryptedAmount);
    }

    // Fall back to raw data if parsed not available
    if (ix.data) {
      return ix.data;
    }

    return "unknown";
  }

  /**
   * Extract auditor public key (if set)
   * Auditor can decrypt ALL amounts - centralization risk!
   */
  private extractAuditorKey(tx: any, mint: string): string | undefined {
    // Auditor key is stored in mint account extensions
    // For now, we'll extract it from instruction accounts
    const instructions = tx.transaction.message.instructions || [];

    for (const ix of instructions) {
      if (
        ix.parsed?.type === "InitializeMint" &&
        ix.parsed?.info?.mint === mint
      ) {
        return ix.parsed.info.auditorElGamalPubkey;
      }
    }

    return undefined;
  }

  /**
   * Aggregate account statistics
   */
  async aggregateAccounts(
    transfers: ConfidentialTransfer[],
  ): Promise<Map<string, ConfidentialAccount>> {
    const accounts = new Map<string, ConfidentialAccount>();

    for (const ct of transfers) {
      // Track source owner
      this.updateAccount(accounts, ct.sourceOwner, ct, true);
      // Track destination owner
      this.updateAccount(accounts, ct.destinationOwner, ct, false);
    }

    return accounts;
  }

  /**
   * Update account statistics
   */
  private updateAccount(
    accounts: Map<string, ConfidentialAccount>,
    owner: string,
    ct: ConfidentialTransfer,
    isSource: boolean,
  ) {
    if (owner === "unknown") return;

    const account = accounts.get(owner) || {
      address: owner,
      owner: owner,
      mint: ct.mint,
      firstConfidentialTx: ct.timestamp,
      lastConfidentialTx: ct.timestamp,
      totalConfidentialTxs: 0,
      alsoUsedPublic: false,
    };

    account.totalConfidentialTxs++;
    account.lastConfidentialTx = Math.max(
      account.lastConfidentialTx,
      ct.timestamp,
    );
    account.firstConfidentialTx = Math.min(
      account.firstConfidentialTx,
      ct.timestamp,
    );

    accounts.set(owner, account);
  }

  /**
   * Aggregate mint statistics
   */
  async aggregateMints(
    transfers: ConfidentialTransfer[],
  ): Promise<Map<string, ConfidentialMint>> {
    const mints = new Map<string, ConfidentialMint>();

    for (const ct of transfers) {
      const mint = mints.get(ct.mint) || {
        address: ct.mint,
        auditorKey: ct.auditorKey,
        totalConfidentialTxs: 0,
        uniqueUsers: 0,
        firstSeen: ct.timestamp,
        lastSeen: ct.timestamp,
      };

      mint.totalConfidentialTxs++;
      mint.lastSeen = Math.max(mint.lastSeen, ct.timestamp);
      mint.firstSeen = Math.min(mint.firstSeen, ct.timestamp);

      if (ct.auditorKey && !mint.auditorKey) {
        mint.auditorKey = ct.auditorKey;
      }

      mints.set(ct.mint, mint);
    }

    // Count unique users per mint
    for (const [mintAddress, mint] of Array.from(mints.entries())) {
      const users = new Set<string>();
      for (const ct of transfers) {
        if (ct.mint === mintAddress) {
          users.add(ct.sourceOwner);
          users.add(ct.destinationOwner);
        }
      }
      mint.uniqueUsers = users.size;
    }

    return mints;
  }
}
