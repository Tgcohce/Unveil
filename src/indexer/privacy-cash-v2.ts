/**
 * Privacy Cash transaction parser V2
 * FIXED: Uses correct "transact" discriminator
 */

import { ParsedTransaction, Deposit, Withdrawal, TransactionInstruction } from './types';
import bs58 from 'bs58';

// CORRECT discriminator for Privacy Cash
const TRANSACT_DISCRIMINATOR = Buffer.from([217, 149, 130, 143, 221, 52, 252, 119]);

export class PrivacyCashParserV2 {
  private programId: string;

  constructor(programId: string) {
    this.programId = programId;
  }

  /**
   * Parse a transaction
   * Privacy Cash uses a single "transact" instruction that handles everything
   */
  parseTransaction(tx: ParsedTransaction): {
    type: 'deposit' | 'withdrawal' | 'unknown';
    data: Deposit | Withdrawal | null
  } {
    // Find Privacy Cash instruction
    const instruction = tx.instructions.find(instr => instr.programId === this.programId);

    if (!instruction) {
      return { type: 'unknown', data: null };
    }

    const discriminator = instruction.data.slice(0, 8);

    // Check if it's the transact instruction
    if (discriminator.equals(TRANSACT_DISCRIMINATOR)) {
      return this.parseTransact(tx, instruction);
    }

    return { type: 'unknown', data: null };
  }

  /**
   * Parse transact instruction
   *
   * The instruction is 686-696 bytes containing:
   * - Discriminator: 8 bytes
   * - Operation indicator: Need to determine from accounts/data
   * - ZK proof data: ~300+ bytes
   * - Encrypted note: ~100+ bytes
   * - Other data: nullifiers, commitments, etc.
   *
   * We need to look at the accounts to determine operation type:
   * - Deposits: SOL flows INTO a program PDA
   * - Withdrawals: SOL flows OUT of a program PDA
   */
  private parseTransact(
    tx: ParsedTransaction,
    instruction: TransactionInstruction
  ): { type: 'deposit' | 'withdrawal' | 'unknown'; data: Deposit | Withdrawal | null } {
    try {
      const data = instruction.data;

      // The instruction is too complex to parse without the IDL
      // For now, we'll mark all as transactions but can't distinguish deposit/withdraw
      // from just the instruction data alone

      // Extract what we can:
      // First 8 bytes: discriminator
      // Next bytes: varies by operation

      // For demo purposes, we'll create a simplified parser
      // that looks at account patterns to infer operation type

      // In a real implementation, we'd need:
      // 1. The full IDL from anchor idl fetch
      // 2. Or reverse engineer the exact data layout
      // 3. Or look at account changes (SOL transfers) in the transaction

      // For now, return unknown since we can't reliably parse without IDL
      console.log(`Found transact instruction: ${data.length} bytes`);

      return {
        type: 'unknown',
        data: null
      };

    } catch (error) {
      console.error(`Error parsing transact ${tx.signature}:`, error);
      return { type: 'unknown', data: null };
    }
  }

  /**
   * Batch parse multiple transactions
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
      const parsed = this.parseTransaction(tx);

      if (parsed.type === 'deposit' && parsed.data) {
        deposits.push(parsed.data as Deposit);
      } else if (parsed.type === 'withdrawal' && parsed.data) {
        withdrawals.push(parsed.data as Withdrawal);
      } else {
        unknown++;
      }
    }

    return { deposits, withdrawals, unknown };
  }
}
