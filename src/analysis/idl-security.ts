/**
 * IDL Security Analysis Module
 *
 * Analyzes Anchor IDLs for security vulnerabilities and red flags.
 * This provides a "smart contract audit lite" score for privacy protocols.
 *
 * Key areas analyzed:
 * 1. Admin backdoors (balance resets, emergency functions)
 * 2. Authorization flaws (who can sign critical operations)
 * 3. Missing constraints (has_one, seeds, signer checks)
 * 4. Centralization risks (single authority, no multisig)
 * 5. Fake cryptography claims (ZK in name but no proof verification)
 */

export interface IDLInstruction {
  name: string;
  accounts: Array<{
    name: string;
    isMut: boolean;
    isSigner: boolean;
    // Optional Anchor constraints
    pda?: { seeds: string[] };
    hasOne?: string[];
    constraint?: string;
  }>;
  args: Array<{
    name: string;
    type: string | { array: [string, number] } | { vec: string } | { option: string };
  }>;
}

export interface IDLAccount {
  name: string;
  type: {
    kind: string;
    fields: Array<{
      name: string;
      type: string | { array: [string, number] };
    }>;
  };
}

export interface AnchorIDL {
  version: string;
  name: string;
  instructions: IDLInstruction[];
  accounts: IDLAccount[];
  errors?: Array<{ code: number; name: string; msg?: string }>;
}

export interface IDLSecurityIssue {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: string;
  title: string;
  description: string;
  instruction?: string;
  recommendation: string;
}

export interface IDLSecurityAnalysis {
  protocol: string;
  version: string;
  securityScore: number; // 0-100

  // Issue counts by severity
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;

  // Detailed issues
  issues: IDLSecurityIssue[];

  // Summary flags
  hasAdminBackdoor: boolean;
  hasProperAuthorization: boolean;
  hasAccountConstraints: boolean;
  hasFakeZKClaims: boolean;
  isCentralized: boolean;
  isProductionReady: boolean;

  // Recommendations
  recommendations: string[];
}

/**
 * Analyze an Anchor IDL for security issues
 */
export function analyzeIDLSecurity(idl: AnchorIDL): IDLSecurityAnalysis {
  const issues: IDLSecurityIssue[] = [];

  // 1. Check for admin backdoors
  const backdoorIssues = checkAdminBackdoors(idl);
  issues.push(...backdoorIssues);

  // 2. Check authorization patterns
  const authIssues = checkAuthorization(idl);
  issues.push(...authIssues);

  // 3. Check for missing constraints
  const constraintIssues = checkConstraints(idl);
  issues.push(...constraintIssues);

  // 4. Check for fake ZK claims
  const zkIssues = checkFakeZK(idl);
  issues.push(...zkIssues);

  // 5. Check centralization risks
  const centralIssues = checkCentralization(idl);
  issues.push(...centralIssues);

  // 6. Check version maturity
  const versionIssues = checkVersion(idl);
  issues.push(...versionIssues);

  // Calculate scores
  const criticalCount = issues.filter(i => i.severity === "CRITICAL").length;
  const highCount = issues.filter(i => i.severity === "HIGH").length;
  const mediumCount = issues.filter(i => i.severity === "MEDIUM").length;
  const lowCount = issues.filter(i => i.severity === "LOW").length;

  // Score calculation: Start at 100, deduct for issues
  let securityScore = 100;
  securityScore -= criticalCount * 25; // Critical issues are devastating
  securityScore -= highCount * 15;
  securityScore -= mediumCount * 5;
  securityScore -= lowCount * 2;
  securityScore = Math.max(0, securityScore);

  // Summary flags
  const hasAdminBackdoor = issues.some(i =>
    i.category === "ADMIN_BACKDOOR" && (i.severity === "CRITICAL" || i.severity === "HIGH")
  );
  const hasProperAuthorization = !issues.some(i =>
    i.category === "AUTHORIZATION" && i.severity === "CRITICAL"
  );
  const hasAccountConstraints = !issues.some(i =>
    i.category === "CONSTRAINTS" && i.severity === "HIGH"
  );
  const hasFakeZKClaims = issues.some(i => i.category === "FAKE_ZK");
  const isCentralized = issues.some(i => i.category === "CENTRALIZATION");
  const isProductionReady = securityScore >= 70 && criticalCount === 0;

  // Generate recommendations
  const recommendations = generateRecommendations(issues);

  return {
    protocol: idl.name,
    version: idl.version,
    securityScore,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    issues,
    hasAdminBackdoor,
    hasProperAuthorization,
    hasAccountConstraints,
    hasFakeZKClaims,
    isCentralized,
    isProductionReady,
    recommendations,
  };
}

/**
 * Check for admin backdoor functions
 */
function checkAdminBackdoors(idl: AnchorIDL): IDLSecurityIssue[] {
  const issues: IDLSecurityIssue[] = [];

  // Suspicious function name patterns
  const backdoorPatterns = [
    { pattern: /reset.*balance/i, severity: "CRITICAL" as const, desc: "Can reset user balances" },
    { pattern: /drain/i, severity: "CRITICAL" as const, desc: "Can drain funds" },
    { pattern: /emergency.*withdraw/i, severity: "HIGH" as const, desc: "Emergency withdrawal function" },
    { pattern: /admin.*transfer/i, severity: "CRITICAL" as const, desc: "Admin can transfer user funds" },
    { pattern: /force.*close/i, severity: "HIGH" as const, desc: "Can force close user accounts" },
    { pattern: /set.*owner/i, severity: "MEDIUM" as const, desc: "Can change ownership" },
    { pattern: /pause/i, severity: "LOW" as const, desc: "Can pause protocol" },
    { pattern: /freeze/i, severity: "MEDIUM" as const, desc: "Can freeze accounts" },
  ];

  for (const instruction of idl.instructions) {
    for (const { pattern, severity, desc } of backdoorPatterns) {
      if (pattern.test(instruction.name)) {
        // Check if user is NOT a signer (admin-only function)
        const userSigns = instruction.accounts.some(a =>
          (a.name.toLowerCase().includes("user") || a.name.toLowerCase().includes("owner")) && a.isSigner
        );

        if (!userSigns) {
          issues.push({
            severity,
            category: "ADMIN_BACKDOOR",
            title: `Admin backdoor: ${instruction.name}`,
            description: `${desc}. User is not required to sign this transaction.`,
            instruction: instruction.name,
            recommendation: "Remove this function or require user signature for any operation affecting their funds.",
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Check authorization patterns
 */
function checkAuthorization(idl: AnchorIDL): IDLSecurityIssue[] {
  const issues: IDLSecurityIssue[] = [];

  // Find instructions that modify user balances/accounts
  const userModifyingPatterns = [
    /transfer/i, /withdraw/i, /deposit/i, /send/i, /move/i, /swap/i
  ];

  for (const instruction of idl.instructions) {
    const modifiesUserFunds = userModifyingPatterns.some(p => p.test(instruction.name));

    if (modifiesUserFunds) {
      // Check who signs
      const signers = instruction.accounts.filter(a => a.isSigner);
      const userSigns = signers.some(a =>
        a.name.toLowerCase().includes("user") ||
        a.name.toLowerCase().includes("owner") ||
        a.name.toLowerCase().includes("sender") ||
        a.name.toLowerCase() === "from"
      );
      const authorityOnlySigns = signers.length > 0 &&
        signers.every(a => a.name.toLowerCase().includes("authority") || a.name.toLowerCase().includes("admin"));

      if (authorityOnlySigns && !userSigns) {
        issues.push({
          severity: "CRITICAL",
          category: "AUTHORIZATION",
          title: `User funds controlled by authority: ${instruction.name}`,
          description: `The "${instruction.name}" instruction modifies user funds but only requires authority signature, not user signature. This means the authority can move user funds without consent.`,
          instruction: instruction.name,
          recommendation: "Require user signature for any operation that affects their funds.",
        });
      }

      // Check for missing signer on mutable user accounts
      const mutableUserAccounts = instruction.accounts.filter(a =>
        a.isMut && (
          a.name.toLowerCase().includes("user") ||
          a.name.toLowerCase().includes("balance") ||
          a.name.toLowerCase().includes("sender")
        )
      );

      for (const account of mutableUserAccounts) {
        if (!userSigns) {
          issues.push({
            severity: "HIGH",
            category: "AUTHORIZATION",
            title: `Mutable user account without user signer: ${account.name}`,
            description: `Account "${account.name}" in "${instruction.name}" is mutable but user doesn't sign the transaction.`,
            instruction: instruction.name,
            recommendation: "Ensure users sign transactions that modify their accounts.",
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Check for missing Anchor constraints
 */
function checkConstraints(idl: AnchorIDL): IDLSecurityIssue[] {
  const issues: IDLSecurityIssue[] = [];

  // Check if any accounts have constraints defined
  let hasAnyConstraints = false;
  let hasAnySeeds = false;
  let hasAnyHasOne = false;

  for (const instruction of idl.instructions) {
    for (const account of instruction.accounts) {
      if (account.pda?.seeds) hasAnySeeds = true;
      if (account.hasOne) hasAnyHasOne = true;
      if (account.constraint) hasAnyConstraints = true;
    }
  }

  // If no constraints found at all, this is suspicious
  if (!hasAnyConstraints && !hasAnySeeds && !hasAnyHasOne) {
    issues.push({
      severity: "HIGH",
      category: "CONSTRAINTS",
      title: "No account constraints visible in IDL",
      description: "The IDL shows no Anchor constraints (has_one, seeds, constraint). This could indicate loose account validation, or constraints are implemented in raw Rust (harder to audit).",
      recommendation: "Use Anchor's declarative constraints for account validation. If using raw Rust, ensure thorough manual review.",
    });
  }

  // Check for PDA accounts without seed definitions
  for (const instruction of idl.instructions) {
    for (const account of instruction.accounts) {
      const likelyPDA = account.name.toLowerCase().includes("pool") ||
                       account.name.toLowerCase().includes("vault") ||
                       account.name.toLowerCase().includes("escrow") ||
                       account.name.toLowerCase().includes("pda");

      if (likelyPDA && !account.pda?.seeds) {
        issues.push({
          severity: "MEDIUM",
          category: "CONSTRAINTS",
          title: `Likely PDA without seed definition: ${account.name}`,
          description: `Account "${account.name}" in "${instruction.name}" appears to be a PDA but has no seed derivation specified in IDL.`,
          instruction: instruction.name,
          recommendation: "Define PDA seeds in the IDL for transparency and verification.",
        });
      }
    }
  }

  return issues;
}

/**
 * Check for fake ZK claims
 */
function checkFakeZK(idl: AnchorIDL): IDLSecurityIssue[] {
  const issues: IDLSecurityIssue[] = [];

  // Look for ZK-related naming
  const zkPatterns = [/zk/i, /zero.*knowledge/i, /snark/i, /stark/i, /proof/i, /private/i];

  for (const instruction of idl.instructions) {
    const claimsZK = zkPatterns.some(p => p.test(instruction.name));

    if (claimsZK) {
      // Check if there's actual proof data with proper structure
      const hasProofArg = instruction.args.some(a =>
        a.name.toLowerCase().includes("proof") &&
        (typeof a.type === "object" && "array" in a.type && a.type.array[1] >= 32) // At least 32 bytes for real proof
      );

      // Check for suspicious "encrypted data" that's just raw bytes
      const hasSuspiciousBytes = instruction.args.some(a =>
        (a.name.toLowerCase().includes("encrypted") || a.name.toLowerCase().includes("data")) &&
        a.type === "bytes"
      );

      // Check if user signs (real ZK should have user generate proof)
      const userSigns = instruction.accounts.some(a =>
        (a.name.toLowerCase().includes("user") || a.name.toLowerCase().includes("sender")) &&
        a.isSigner
      );

      if (hasSuspiciousBytes && !hasProofArg) {
        issues.push({
          severity: "CRITICAL",
          category: "FAKE_ZK",
          title: `Potentially fake ZK: ${instruction.name}`,
          description: `Instruction "${instruction.name}" claims ZK functionality but takes raw "bytes" instead of structured proof data. Real ZK proofs have specific structures (e.g., Groth16: 256 bytes, Bulletproofs: variable but structured).`,
          instruction: instruction.name,
          recommendation: "If implementing ZK, use proper proof verification libraries (e.g., groth16-solana, light-protocol). Raw bytes are not verifiable.",
        });
      }

      if (!userSigns) {
        issues.push({
          severity: "HIGH",
          category: "FAKE_ZK",
          title: `ZK instruction without user signature: ${instruction.name}`,
          description: `ZK instruction "${instruction.name}" doesn't require user signature. In real ZK protocols, users generate proofs locally and sign to submit them.`,
          instruction: instruction.name,
          recommendation: "Users should generate ZK proofs client-side and sign to submit. Authority-only ZK defeats the purpose.",
        });
      }
    }
  }

  return issues;
}

/**
 * Check centralization risks
 */
function checkCentralization(idl: AnchorIDL): IDLSecurityIssue[] {
  const issues: IDLSecurityIssue[] = [];

  // Count instructions that require authority
  let authorityOnlyCount = 0;
  const criticalAuthorityOps: string[] = [];

  for (const instruction of idl.instructions) {
    const signers = instruction.accounts.filter(a => a.isSigner);
    const onlyAuthoritySigns = signers.length > 0 &&
      signers.every(a =>
        a.name.toLowerCase().includes("authority") ||
        a.name.toLowerCase().includes("admin") ||
        a.name.toLowerCase().includes("programauthority")
      );

    if (onlyAuthoritySigns) {
      authorityOnlyCount++;

      // Check if this is a critical operation
      const isCritical = /transfer|withdraw|balance|pool|vault/i.test(instruction.name);
      if (isCritical) {
        criticalAuthorityOps.push(instruction.name);
      }
    }
  }

  if (authorityOnlyCount > idl.instructions.length * 0.3) {
    issues.push({
      severity: "MEDIUM",
      category: "CENTRALIZATION",
      title: "High authority concentration",
      description: `${authorityOnlyCount} of ${idl.instructions.length} instructions (${Math.round(authorityOnlyCount/idl.instructions.length*100)}%) require only authority signature. This creates significant centralization risk.`,
      recommendation: "Consider multisig authority, timelocks, or governance for critical operations.",
    });
  }

  if (criticalAuthorityOps.length > 0) {
    issues.push({
      severity: "HIGH",
      category: "CENTRALIZATION",
      title: "Critical operations controlled by single authority",
      description: `These critical operations require only authority: ${criticalAuthorityOps.join(", ")}. A compromised or malicious authority can drain user funds.`,
      recommendation: "Implement multisig (e.g., Squads) for critical operations. Add timelocks for non-emergency actions.",
    });
  }

  return issues;
}

/**
 * Check version maturity
 */
function checkVersion(idl: AnchorIDL): IDLSecurityIssue[] {
  const issues: IDLSecurityIssue[] = [];

  const version = idl.version;
  const [major] = version.split(".").map(Number);

  if (major === 0) {
    issues.push({
      severity: "MEDIUM",
      category: "MATURITY",
      title: `Pre-release version: ${version}`,
      description: `Version ${version} indicates pre-release software. Deploying 0.x.x versions to mainnet with real user funds is risky.`,
      recommendation: "Reach version 1.0.0 after thorough auditing before mainnet deployment with significant TVL.",
    });
  }

  return issues;
}

/**
 * Generate recommendations based on issues
 */
function generateRecommendations(issues: IDLSecurityIssue[]): string[] {
  const recommendations: string[] = [];
  const categories = new Set(issues.map(i => i.category));

  if (categories.has("ADMIN_BACKDOOR")) {
    recommendations.push("Remove admin backdoors or implement timelock + multisig governance");
  }

  if (categories.has("AUTHORIZATION")) {
    recommendations.push("Require user signatures for all operations affecting user funds");
  }

  if (categories.has("CONSTRAINTS")) {
    recommendations.push("Add explicit Anchor constraints (has_one, seeds, constraint) for account validation");
  }

  if (categories.has("FAKE_ZK")) {
    recommendations.push("Replace raw bytes with proper ZK proof verification (Groth16, Bulletproofs with verification)");
  }

  if (categories.has("CENTRALIZATION")) {
    recommendations.push("Implement multisig authority using Squads or similar");
    recommendations.push("Add timelocks for critical operations");
  }

  if (categories.has("MATURITY")) {
    recommendations.push("Complete security audit before mainnet deployment");
  }

  return recommendations;
}

/**
 * ShadowWire IDL (from user's input)
 */
export const SHADOWWIRE_IDL: AnchorIDL = {
  version: "0.1.0",
  name: "shadowid",
  instructions: [
    {
      name: "initialize_pool",
      accounts: [
        { name: "pool", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "mint", type: "publicKey" }],
    },
    {
      name: "initialize_user_balance",
      accounts: [
        { name: "user", isMut: true, isSigner: true },
        { name: "pool", isMut: false, isSigner: false },
        { name: "userBalance", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "deposit_to_pool",
      accounts: [
        { name: "user", isMut: true, isSigner: true },
        { name: "pool", isMut: true, isSigner: false },
        { name: "userBalance", isMut: true, isSigner: false },
        { name: "userTokenAccount", isMut: true, isSigner: false },
        { name: "poolTokenAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "withdraw_from_pool",
      accounts: [
        { name: "user", isMut: true, isSigner: true },
        { name: "pool", isMut: true, isSigner: false },
        { name: "userBalance", isMut: true, isSigner: false },
        { name: "escrow", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "withdraw_from_pool_to_wallet",
      accounts: [
        { name: "user", isMut: true, isSigner: true },
        { name: "pool", isMut: true, isSigner: false },
        { name: "userBalance", isMut: true, isSigner: false },
        { name: "userTokenAccount", isMut: true, isSigner: false },
        { name: "poolTokenAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "zk_internal_transfer",
      accounts: [
        { name: "pool", isMut: true, isSigner: false },
        { name: "senderBalance", isMut: true, isSigner: false },
        { name: "receiverBalance", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
      ],
      args: [{ name: "encryptedData", type: "bytes" }],
    },
    {
      name: "reset_corrupt_balance",
      accounts: [
        { name: "programAuthority", isMut: false, isSigner: true },
        { name: "userBalance", isMut: true, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Pool",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "mint", type: "publicKey" },
          { name: "totalDeposited", type: "u64" },
          { name: "totalWithdrawn", type: "u64" },
        ],
      },
    },
    {
      name: "UserPoolBalance",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "publicKey" },
          { name: "mint", type: "publicKey" },
          { name: "obfuscationVersion", type: "u8" },
          { name: "deposited", type: "u64" },
          { name: "available", type: "u64" },
          { name: "withdrawnToEscrow", type: "u64" },
          { name: "withdrawnToWallet", type: "u64" },
          { name: "commitmentSum", type: { array: ["u8", 32] } },
        ],
      },
    },
  ],
};

/**
 * Run analysis on ShadowWire and return results
 */
export function analyzeShadowWire(): IDLSecurityAnalysis {
  return analyzeIDLSecurity(SHADOWWIRE_IDL);
}

/**
 * Protocol comparison for dashboard
 */
export interface ProtocolIDLComparison {
  protocol: string;
  idlAvailable: boolean;
  securityScore: number;
  hasAdminBackdoor: boolean;
  userSignsTransfers: boolean;
  hasProofVerification: boolean;
  hasConstraints: boolean;
  isDecentralized: boolean;
  criticalIssues: number;
  highIssues: number;
  verdict: "SAFE" | "CAUTION" | "DANGER" | "UNKNOWN";
}

export function getProtocolComparisons(): ProtocolIDLComparison[] {
  const shadowWireAnalysis = analyzeShadowWire();

  return [
    {
      protocol: "ShadowWire",
      idlAvailable: true,
      securityScore: shadowWireAnalysis.securityScore,
      hasAdminBackdoor: shadowWireAnalysis.hasAdminBackdoor,
      userSignsTransfers: false, // zk_internal_transfer is authority-only
      hasProofVerification: false, // Just raw bytes
      hasConstraints: false,
      isDecentralized: false,
      criticalIssues: shadowWireAnalysis.criticalCount,
      highIssues: shadowWireAnalysis.highCount,
      verdict: "DANGER",
    },
    {
      protocol: "Privacy Cash",
      idlAvailable: false,
      securityScore: -1, // Unknown - no IDL
      hasAdminBackdoor: false, // Unknown
      userSignsTransfers: true, // Based on observed behavior
      hasProofVerification: false, // No ZK, just balance mixing
      hasConstraints: false, // Unknown
      isDecentralized: false, // Unknown
      criticalIssues: 0,
      highIssues: 0,
      verdict: "UNKNOWN",
    },
    {
      protocol: "Confidential Transfers",
      idlAvailable: true, // SPL Token-2022 is open
      securityScore: 85,
      hasAdminBackdoor: false,
      userSignsTransfers: true,
      hasProofVerification: true, // ElGamal + range proofs
      hasConstraints: true, // SPL Token program constraints
      isDecentralized: true, // Solana Labs maintained
      criticalIssues: 0,
      highIssues: 0,
      verdict: "SAFE",
    },
    {
      protocol: "SilentSwap",
      idlAvailable: false, // Off-chain routing
      securityScore: 40,
      hasAdminBackdoor: false,
      userSignsTransfers: true,
      hasProofVerification: false, // TEE-based, not on-chain proofs
      hasConstraints: false, // N/A - off-chain
      isDecentralized: false, // Centralized facilitators
      criticalIssues: 0,
      highIssues: 1, // Centralization
      verdict: "CAUTION",
    },
  ];
}
