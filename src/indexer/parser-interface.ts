/**
 * Abstract Transaction Parser Interface
 *
 * This defines the interface that all protocol-specific parsers must implement.
 * Each privacy protocol can have its own parser implementation.
 */

export interface ParsedBalanceChange {
  address: string;
  change: number; // lamports (positive = received, negative = sent)
  preBalance: number;
  postBalance: number;
}

export interface ParsedDeposit {
  signature: string;
  timestamp: number;
  amount: number; // lamports
  depositor: string;
  poolAccount?: string;
  metadata?: Record<string, any>;
}

export interface ParsedWithdrawal {
  signature: string;
  timestamp: number;
  amount: number; // lamports
  recipient: string;
  poolAccount?: string;
  metadata?: Record<string, any>;
}

export type ParsedTransaction = ParsedDeposit | ParsedWithdrawal | null;

/**
 * Abstract base class for transaction parsers
 */
export abstract class TransactionParser {
  protected depositThreshold: number;
  protected withdrawalThreshold: number;

  constructor(depositThreshold = 100000, withdrawalThreshold = 100000) {
    this.depositThreshold = depositThreshold;
    this.withdrawalThreshold = withdrawalThreshold;
  }

  /**
   * Parse a transaction and determine if it's a deposit, withdrawal, or neither
   *
   * @param signature - Transaction signature
   * @param timestamp - Transaction timestamp (Unix ms)
   * @param feePayer - Address that paid transaction fees
   * @param balanceChanges - Array of account balance changes
   * @returns Parsed transaction or null if not relevant
   */
  abstract parse(
    signature: string,
    timestamp: number,
    feePayer: string,
    balanceChanges: ParsedBalanceChange[],
  ): ParsedTransaction;

  /**
   * Get the protocol name this parser is for
   */
  abstract getProtocolName(): string;
}

/**
 * Factory for creating parsers based on protocol configuration
 */
export class ParserFactory {
  private static parsers = new Map<string, typeof TransactionParser>();

  /**
   * Register a parser class for a protocol
   */
  static register(
    protocolId: string,
    parserClass: typeof TransactionParser,
  ): void {
    this.parsers.set(protocolId, parserClass);
  }

  /**
   * Create a parser instance for a protocol
   */
  static create(
    protocolId: string,
    depositThreshold?: number,
    withdrawalThreshold?: number,
  ): TransactionParser {
    const ParserClass = this.parsers.get(protocolId);
    if (!ParserClass) {
      throw new Error(`No parser registered for protocol: ${protocolId}`);
    }
    // @ts-ignore - Cannot instantiate abstract class, but subclasses are concrete
    return new ParserClass(depositThreshold, withdrawalThreshold);
  }

  /**
   * Check if a parser is registered for a protocol
   */
  static has(protocolId: string): boolean {
    return this.parsers.has(protocolId);
  }
}
