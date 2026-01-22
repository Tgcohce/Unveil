/**
 * Privacy Cash transaction parser
 * Parses on-chain instructions to extract deposit and withdrawal data
 */

import { ParsedTransaction, Deposit, Withdrawal, TransactionInstruction } from './types';
import bs58 from 'bs58';

// Privacy Cash program instruction discriminators
// These are the first 8 bytes of the instruction data that identify the instruction type
const DEPOSIT_DISCRIMINATOR = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]);
const WITHDRAW_DISCRIMINATOR = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]);

export class PrivacyCashParser {
  private programId: string;

  constructor(programId: string) {
    this.programId = programId;
  }

  /**
   * Parse a transaction to identify if it's a deposit or withdrawal
   * @param tx Parsed transaction from Helius
   */
  parseTransaction(tx: ParsedTransaction): { type: 'deposit' | 'withdrawal' | 'unknown'; data: Deposit | Withdrawal | null } {
    // Find Privacy Cash instruction
    const instruction = tx.instructions.find(instr => instr.programId === this.programId);

    if (!instruction) {
      return { type: 'unknown', data: null };
    }

    const discriminator = instruction.data.slice(0, 8);

    // Check if it's a deposit
    if (discriminator.equals(DEPOSIT_DISCRIMINATOR)) {
      const deposit = this.parseDeposit(tx, instruction);
      return { type: 'deposit', data: deposit };
    }

    // Check if it's a withdrawal
    if (discriminator.equals(WITHDRAW_DISCRIMINATOR)) {
      const withdrawal = this.parseWithdrawal(tx, instruction);
      return { type: 'withdrawal', data: withdrawal };
    }

    return { type: 'unknown', data: null };
  }

  /**
   * Parse a deposit instruction
   */
  private parseDeposit(tx: ParsedTransaction, instruction: TransactionInstruction): Deposit | null {
    try {
      const data = instruction.data;

      // Instruction layout (after 8-byte discriminator):
      // - commitment: 32 bytes (Pedersen commitment)
      // - amount: 8 bytes (u64, little-endian)

      if (data.length < 8 + 32 + 8) {
        console.warn(`Deposit instruction too short: ${tx.signature}`);
        return null;
      }

      const commitment = data.slice(8, 40).toString('hex');
      const amount = data.readBigUInt64LE(40);

      // The depositor is typically the first signer
      const depositor = instruction.keys.find(k => k.isSigner)?.pubkey || instruction.keys[0]?.pubkey;

      if (!depositor) {
        console.warn(`No depositor found: ${tx.signature}`);
        return null;
      }

      return {
        signature: tx.signature,
        timestamp: tx.timestamp,
        slot: tx.slot,
        amount: Number(amount),
        depositor,
        commitment,
        spent: false,
      };
    } catch (error) {
      console.error(`Error parsing deposit ${tx.signature}:`, error);
      return null;
    }
  }

  /**
   * Parse a withdrawal instruction
   */
  private parseWithdrawal(tx: ParsedTransaction, instruction: TransactionInstruction): Withdrawal | null {
    try {
      const data = instruction.data;

      // Instruction layout (after 8-byte discriminator):
      // - nullifier: 32 bytes
      // - recipient: 32 bytes (public key)
      // - relayer: 32 bytes (public key, optional)
      // - fee: 8 bytes (u64, little-endian)
      // - amount: 8 bytes (u64, little-endian)

      if (data.length < 8 + 32 + 32 + 32 + 8 + 8) {
        console.warn(`Withdrawal instruction too short: ${tx.signature}`);
        return null;
      }

      const nullifier = data.slice(8, 40).toString('hex');
      const recipientBytes = data.slice(40, 72);
      const relayerBytes = data.slice(72, 104);
      const fee = data.readBigUInt64LE(104);
      const amount = data.readBigUInt64LE(112);

      // Convert recipient bytes to base58
      const recipient = bs58.encode(recipientBytes);
      const relayer = bs58.encode(relayerBytes);

      return {
        signature: tx.signature,
        timestamp: tx.timestamp,
        slot: tx.slot,
        amount: Number(amount),
        recipient,
        nullifier,
        relayer,
        fee: Number(fee),
      };
    } catch (error) {
      console.error(`Error parsing withdrawal ${tx.signature}:`, error);
      return null;
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
