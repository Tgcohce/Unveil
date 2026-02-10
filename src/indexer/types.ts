/**
 * Core data types for UNVEIL privacy benchmark
 */

export interface Deposit {
  signature: string; // Transaction signature (unique ID)
  timestamp: number; // Unix timestamp (ms)
  slot: number; // Solana slot number
  amount: number; // Deposit amount in lamports
  depositor: string; // Source wallet address
  commitment: string; // ZK commitment hash (Pedersen commitment)
  spent: boolean; // Whether withdrawn
  spentAt?: number; // Withdrawal timestamp if spent
  withdrawalSignature?: string; // Linked withdrawal signature
}

export interface Withdrawal {
  signature: string; // Transaction signature (unique ID)
  timestamp: number; // Unix timestamp (ms)
  slot: number; // Solana slot number
  amount: number; // Withdrawal amount in lamports (pre-fee)
  recipient: string; // Destination wallet address
  nullifier: string; // Prevents double-spend
  relayer: string; // Optional relayer address
  fee: number; // Protocol fee in lamports
}

export interface ProtocolMetrics {
  protocol: string; // Protocol name
  programId: string; // Solana program ID
  tvl: number; // Total value locked (lamports)
  totalDeposits: number; // Count of deposits
  totalWithdrawals: number; // Count of withdrawals
  uniqueDepositors: number; // Unique wallet count

  // Privacy metrics
  avgAnonymitySet: number; // Mean anonymity set size
  medianAnonymitySet: number; // Median anonymity set
  minAnonymitySet: number; // Worst case

  timingEntropy: number; // Shannon entropy of timing
  medianTimeDelta: number; // Median deposit→withdrawal time (ms)

  uniqueAmountRatio: number; // % of deposits with unique amounts
  commonAmounts: number[]; // Most used amounts

  privacyScore: number; // Composite score (0-100)

  lastUpdated: number; // Last indexing timestamp
}

export interface AnonymitySetSnapshot {
  timestamp: number; // Snapshot time
  avgSize: number; // Average anonymity set
  minSize: number; // Minimum anonymity set
  maxSize: number; // Maximum anonymity set
  activeDeposits: number; // Unspent deposits
}

export interface DepositWithdrawalPair {
  deposit: Deposit;
  withdrawal: Withdrawal;
  timeDelta: number; // ms between deposit and withdrawal
  anonymitySet: number; // Anonymity set at withdrawal time
}

export interface TransactionInstruction {
  programId: string;
  data: Buffer;
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
}

export interface ParsedTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  instructions: TransactionInstruction[];
  type?: "deposit" | "withdrawal" | "unknown";
  // Add balance change data for SOL flow analysis
  meta?: any;
  accountKeys?: string[];
}

export interface ParsedPrivacyCashTx {
  signature: string;
  timestamp: number;
  type: "deposit" | "withdrawal" | "unknown";
  amount: number; // in lamports
  userWallet: string;
}

export interface IndexerConfig {
  heliusApiKey: string;
  programId: string;
  batchSize: number;
  delayMs: number;
  databasePath: string;
}

export interface IndexerState {
  lastSignature?: string;
  lastSlot: number;
  totalIndexed: number;
  isRunning: boolean;
}

export interface PrivacyAdvisorRequest {
  amount: number; // Desired deposit amount (lamports)
  delayHours: number; // Expected delay before withdrawal
}

export interface PrivacyAdvisorResponse {
  estimatedAnonymitySet: number;
  recommendation: string;
  betterAmounts: number[];
  betterTiming: string;
  currentMetrics: {
    avgAnonymitySet: number;
    activeDeposits: number;
    recentActivity: number;
  };
}

export interface TimingDistribution {
  buckets: Map<number, number>; // bucket (hours) -> count
  mean: number;
  median: number;
  p25: number; // 25th percentile
  p75: number; // 75th percentile
  entropy: number; // Shannon entropy
}

export interface AmountDistribution {
  amounts: Map<number, number>; // amount -> count
  uniqueCount: number;
  totalCount: number;
  uniqueRatio: number;
  topAmounts: Array<{ amount: number; count: number }>;
}

/**
 * Confidential Transfer Types (Token-2022)
 */

export interface ConfidentialTransfer {
  signature: string; // Transaction signature
  timestamp: number; // Unix timestamp (ms)
  slot: number; // Solana slot number
  mint: string; // Token mint address
  source: string; // Source token account
  destination: string; // Destination token account
  sourceOwner: string; // Source account owner (VISIBLE!)
  destinationOwner: string; // Destination account owner (VISIBLE!)
  encryptedAmount: string; // ElGamal encrypted amount (hidden)
  auditorKey?: string; // Auditor public key (if set)
  instructionType: "ApplyPendingBalance" | "Transfer" | "Withdraw" | "Deposit"; // CT instruction type
}

export interface ConfidentialAccount {
  address: string; // Token account address
  owner: string; // Owner wallet
  mint: string; // Token mint
  firstConfidentialTx: number; // First CT timestamp
  lastConfidentialTx: number; // Last CT timestamp
  totalConfidentialTxs: number; // Count of CTs
  alsoUsedPublic: boolean; // Used for public transfers too?
}

export interface ConfidentialMint {
  address: string; // Mint address
  auditorKey?: string; // Centralized auditor?
  totalConfidentialTxs: number; // CT activity
  uniqueUsers: number; // Unique addresses
  firstSeen: number; // First CT timestamp
  lastSeen: number; // Last CT timestamp
}

export interface ConfidentialAnalysisResult {
  // Address reuse analysis
  addressReuseRate: number; // % of addresses used multiple times
  avgTxsPerAddress: number; // Mean txs per address
  publicPrivateMixRate: number; // % of accounts mixing public/confidential

  // Timing analysis
  timingEntropy: number; // Shannon entropy of timing
  avgTimeBetweenTxs: number; // Mean time between CTs
  timingClustering: number; // 0-1, how clustered timing is

  // Auditor centralization
  mintsWithAuditors: number; // Count with auditor keys
  uniqueAuditors: number; // Distinct auditor keys
  auditorCentralization: number; // 0-1, how centralized

  // Public/confidential correlation
  avgTimeConfidential: number; // Mean time funds stay encrypted
  immediateConversionRate: number; // % converted back quickly

  // Privacy score
  privacyScore: number; // 0-100 composite score
  vulnerabilities: string[]; // List of issues found
  recommendations: string[]; // How to improve
}

/**
 * ShadowWire Types (Bulletproof-based mixing protocol)
 */

// ShadowWire Pool Addresses (different PDAs for different tokens)
// Each token has its own pool PDA that manages the encrypted balances
export const SHADOWWIRE_POOL_ADDRESSES = [
  "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU", // SOL pool
  "3hShyAWTjsm63TnMHCVSerjwmvgtMmvCNSgyXqeQqFft", // BONK pool
  "2nwRTVmRSPgLZcdvmUguftrpcnU4Lzg8Nm5dMT9AAazS", // GOD pool
  "14kbizF6VZjSFLS21FjvgPYHz45oLzQBomhpiN89xFqv", // USD1 pool
  "HexBg3QDHTE5SKniXZgDARybQwnoEioDKxoUKBsxhtbT", // Token pool
  "CCG1UCVWhGfZiCHsDYrts24aPD5e6PFFotaswHG1jf5E", // Token pool
  "6ZKFfWG7HqJXhZy3Tcu8qMT25nme1JLDWCyQj5F4NNUM", // Alternative pool PDA
];

export interface ShadowWireTransfer {
  signature: string; // Transaction signature
  timestamp: number; // Unix timestamp (ms)
  sender: string; // Sender wallet (VISIBLE - privacy broken!)
  recipient: string; // Recipient wallet (VISIBLE - privacy broken!)
  amountHidden: boolean; // Whether amount is hidden (FALSE if we extracted it!)
  transferType: "internal" | "external"; // Internal = hidden amount, external = visible
  proofPda?: string; // ZK proof account
  relayerFee: number; // Fee paid to relayer
  token: string; // Token symbol or mint
  amount?: number; // UNMASKED amount in smallest unit (extracted from balance changes!)
  decimals?: number; // Token decimals (needed for proper display)
}

export interface ShadowWireAccount {
  wallet: string; // User wallet address
  available: number; // Available balance (encrypted)
  deposited: number; // Total deposited
  withdrawnToEscrow: number; // Total in escrow
  poolAddress: string; // Pool PDA
  totalTransfers: number; // Count of transfers
  firstSeen: number; // First activity timestamp
  lastSeen: number; // Last activity timestamp
}

/**
 * SilentSwap Types (Cross-chain privacy routing via Secret Network)
 *
 * SilentSwap is a $5K bounty sponsor. It routes funds through Secret Network + TEE
 * to obscure transaction paths. Uses:
 * - relay.link for bridging
 * - deBridge as fallback
 * - One-time HD facilitator wallets
 * - 1% fee, 30 sec - 3 min completion time
 *
 * Attack Vector:
 * - Cross-chain timing correlation (input on Solana -> output on Solana)
 * - Amount matching (input - 1% fee = output)
 * - Multi-output fingerprinting (unique split patterns)
 */

// SilentSwap Solana relay address (from SDK)
export const SILENTSWAP_RELAY_ADDRESS =
  "CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr";

// SilentSwap officially launched on Solana on December 9, 2024.
// Transactions before this date are test/dust activity from the relay address.
export const SILENTSWAP_LAUNCH_DATE = 1733702400000; // 2024-12-09T00:00:00Z in Unix ms

// SilentSwap EVM gateway addresses (for reference)
export const SILENTSWAP_EVM_GATEWAYS = {
  mainnet: "0xA798d4D04faad17C309127C2B9B99Cc459635eDC",
  s0xGateway: "0xAAef732E8B327917BF44A7892102A5ED3Bd27842",
  s0xDepositor: "0x02AcB3A073eF5625Ec0e30481df1cf8c4bD7a98E",
};

// Chain IDs used by SilentSwap
export const SILENTSWAP_CHAIN_IDS = {
  solana_relay: "792703809",
  solana_debridge: "7565164",
  avalanche: "43114",
};

export interface SilentSwapInput {
  id?: number;
  signature: string; // Transaction signature
  timestamp: number; // Unix timestamp (ms)
  userWallet: string; // Source wallet address
  facilitatorWallet: string; // One-time HD facilitator wallet
  amount: number; // Amount in lamports
  token: string; // Token mint or "SOL"
  bridgeProvider: "relay.link" | "debridge" | "unknown";
}

export interface SilentSwapOutput {
  id?: number;
  signature: string; // Transaction signature
  timestamp: number; // Unix timestamp (ms)
  facilitatorWallet: string; // One-time HD facilitator wallet
  destinationWallet: string; // Final recipient
  amount: number; // Amount in lamports (after ~1% fee)
  token: string; // Token mint or "SOL"
  bridgeProvider: "relay.link" | "debridge" | "unknown";
}

export interface SilentSwapMatch {
  inputId: number;
  outputId: number;
  input: SilentSwapInput;
  output: SilentSwapOutput;
  confidence: number; // 0-100%
  timeDeltaSeconds: number; // Time between input and output
  amountRatio: number; // output/input ratio (should be ~0.99 for 1% fee)
  matchReasons: string[]; // Why we think these are linked
}

export interface SilentSwapAnalysisResult {
  protocol: "SilentSwap";
  relayAddress: string;
  privacyScore: number; // 0-100

  // Transaction counts
  totalInputs: number;
  totalOutputs: number;
  matchedPairs: number;

  // Attack metrics
  linkabilityRate: number; // % of transactions we can link
  avgConfidence: number; // Average match confidence
  avgTimeDelta: number; // Average time between input/output

  // Amount analysis
  avgFeeRate: number; // Observed fee rate (should be ~1%)
  amountCorrelationStrength: number; // 0-1, how well amounts match

  // Timing analysis
  timingEntropy: number; // 0-1, randomness of timing
  minTimeDelta: number; // Fastest observed swap
  maxTimeDelta: number; // Slowest observed swap
  timingWindowExploitable: boolean; // If timing window is too predictable

  // Multi-output fingerprinting
  multiOutputSwaps: number; // Swaps with multiple outputs
  uniqueSplitPatterns: number; // Distinct split patterns (fingerprints)
  fingerprintableRate: number; // % of multi-output swaps with unique fingerprints

  // Vulnerabilities and recommendations
  vulnerabilities: string[];
  recommendations: string[];

  // Matched pairs for display
  matches: SilentSwapMatch[];
}

export interface SilentSwapAccount {
  wallet: string; // User or facilitator wallet
  walletType: "user" | "facilitator"; // Type of wallet
  totalInputs: number; // Number of inputs from this wallet
  totalOutputs: number; // Number of outputs to this wallet
  totalVolume: number; // Total volume in lamports
  firstSeen: number; // First activity timestamp
  lastSeen: number; // Last activity timestamp
}

/**
 * Confidential Transfer Deposit/Withdraw Types
 *
 * KEY INSIGHT: Deposit and Withdraw have PUBLIC amounts!
 * - Deposit: User converts public tokens to encrypted balance
 * - Withdraw: User converts encrypted balance back to public tokens
 *
 * Attack Vector:
 * - Match Deposit amounts to Withdraw amounts
 * - Add timing correlation (similar to Privacy Cash attack)
 * - Addresses are ALWAYS visible (sender/receiver)
 *
 * This is a major privacy weakness in Token-2022 Confidential Transfers!
 */

// Token-2022 program address
export const TOKEN_2022_PROGRAM_ID =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// Confidential Transfer instruction discriminators (from Token-2022)
export const CT_INSTRUCTION_DISCRIMINATORS = {
  Deposit: 32, // Amount is PUBLIC
  Withdraw: 33, // Amount is PUBLIC
  Transfer: 34, // Amount is encrypted
  ApplyPendingBalance: 35,
};

export interface CTDeposit {
  id?: number;
  signature: string; // Transaction signature
  timestamp: number; // Unix timestamp (ms)
  slot: number; // Solana slot
  mint: string; // Token mint address
  owner: string; // Account owner (VISIBLE!)
  tokenAccount: string; // Token account address
  amount: number; // PUBLIC deposit amount (in token smallest units)
  decimals: number; // Token decimals
}

export interface CTWithdraw {
  id?: number;
  signature: string; // Transaction signature
  timestamp: number; // Unix timestamp (ms)
  slot: number; // Solana slot
  mint: string; // Token mint address
  owner: string; // Account owner (VISIBLE!)
  tokenAccount: string; // Token account address
  amount: number; // PUBLIC withdraw amount (in token smallest units)
  decimals: number; // Token decimals
}

export interface CTMatch {
  depositId: number;
  withdrawId: number;
  deposit: CTDeposit;
  withdraw: CTWithdraw;
  confidence: number; // 0-100%
  timeDeltaHours: number; // Time between deposit and withdraw
  amountMatch: boolean; // Exact amount match?
  matchReasons: string[]; // Why we think these are linked
}

export interface CTAnalysisResult {
  protocol: "Confidential Transfers";
  programId: string;
  privacyScore: number; // 0-100

  // Transaction counts
  totalDeposits: number;
  totalWithdrawals: number;
  matchedPairs: number;

  // Attack metrics
  linkabilityRate: number; // % of transactions we can link
  avgConfidence: number; // Average match confidence
  avgTimeDelta: number; // Average time between deposit/withdraw (hours)

  // Amount analysis
  exactMatchRate: number; // % of withdrawals with exact amount match
  uniqueAmountRatio: number; // % of unique amounts (harder to link)

  // Address analysis
  addressReuseRate: number; // % of addresses used multiple times
  avgTxsPerAddress: number; // Mean txs per address

  // Vulnerabilities
  vulnerabilities: string[];
  recommendations: string[];

  // Matched pairs for display
  matches: CTMatch[];
}
