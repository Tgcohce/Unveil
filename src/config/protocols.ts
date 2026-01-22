/**
 * Protocol Configuration for UNVEIL
 *
 * This file defines all supported privacy protocols and their configurations.
 * Add new protocols here to enable multi-protocol support.
 */

export interface ProtocolConfig {
  id: string;
  name: string;
  programId: string;
  poolAccounts?: string[];
  description: string;
  enabled: boolean;
  parser: "balance-flow" | "instruction" | "custom";
  parserConfig?: {
    depositThreshold?: number; // Minimum lamports to consider as deposit
    withdrawalThreshold?: number; // Minimum lamports to consider as withdrawal
    customParser?: string; // Path to custom parser module
  };
}

/**
 * Supported Privacy Protocols on Solana
 */
export const PROTOCOLS: ProtocolConfig[] = [
  {
    id: "privacy-cash",
    name: "Privacy Cash",
    programId: "9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD",
    poolAccounts: ["4AV2Qzp3N4c9RfzyEbNZs2wqWfW4EwKnnxFAZCndvfGh"],
    description:
      "Privacy protocol for anonymous SOL transfers using balance flow analysis",
    enabled: true,
    parser: "balance-flow",
    parserConfig: {
      depositThreshold: 100000, // 0.0001 SOL
      withdrawalThreshold: 100000,
    },
  },
  {
    id: "elusiv",
    name: "Elusiv",
    programId: "ELUZRDWMpMNUW6Xq1CaRDgF31YWwZV4FmKALXBHGCFWk", // Elusiv v1 Program ID
    description:
      "Zero-knowledge privacy protocol using ZK-SNARKs for SOL and SPL tokens",
    enabled: false, // Set to true when parser is implemented
    parser: "custom",
    parserConfig: {
      customParser: "./parsers/elusiv-parser",
      depositThreshold: 100000,
      withdrawalThreshold: 100000,
    },
  },
  {
    id: "light-protocol",
    name: "Light Protocol",
    programId: "CbjvJc1SNx1aav8tU49dJGHu8EUdzQJSMtkjDmV8miqK", // Light Protocol v3
    description:
      "ZK Compression protocol for cost-efficient private transactions",
    enabled: false, // Set to true when parser is implemented
    parser: "custom",
    parserConfig: {
      customParser: "./parsers/light-parser",
      depositThreshold: 100000,
      withdrawalThreshold: 100000,
    },
  },
];

/**
 * Get protocol configuration by ID
 */
export function getProtocol(protocolId: string): ProtocolConfig | undefined {
  return PROTOCOLS.find((p) => p.id === protocolId);
}

/**
 * Get all enabled protocols
 */
export function getEnabledProtocols(): ProtocolConfig[] {
  return PROTOCOLS.filter((p) => p.enabled);
}

/**
 * Get protocol by program ID
 */
export function getProtocolByProgramId(
  programId: string,
): ProtocolConfig | undefined {
  return PROTOCOLS.find((p) => p.programId === programId);
}

/**
 * Add a new protocol at runtime
 */
export function addProtocol(config: ProtocolConfig): void {
  const existing = PROTOCOLS.find((p) => p.id === config.id);
  if (existing) {
    throw new Error(`Protocol ${config.id} already exists`);
  }
  PROTOCOLS.push(config);
}

/**
 * Protocol Registry for Dynamic Protocol Support
 *
 * This allows sponsors to register their protocols dynamically
 * without modifying core UNVEIL code.
 */
export class ProtocolRegistry {
  private static protocols = new Map<string, ProtocolConfig>();

  static {
    // Initialize with default protocols
    PROTOCOLS.forEach((p) => this.protocols.set(p.id, p));
  }

  /**
   * Register a new protocol
   */
  static register(config: ProtocolConfig): void {
    if (this.protocols.has(config.id)) {
      throw new Error(`Protocol ${config.id} already registered`);
    }
    this.protocols.set(config.id, config);
  }

  /**
   * Get protocol by ID
   */
  static get(protocolId: string): ProtocolConfig | undefined {
    return this.protocols.get(protocolId);
  }

  /**
   * Get all protocols
   */
  static getAll(): ProtocolConfig[] {
    return Array.from(this.protocols.values());
  }

  /**
   * Get enabled protocols
   */
  static getEnabled(): ProtocolConfig[] {
    return Array.from(this.protocols.values()).filter((p) => p.enabled);
  }

  /**
   * Enable a protocol
   */
  static enable(protocolId: string): void {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) {
      throw new Error(`Protocol ${protocolId} not found`);
    }
    protocol.enabled = true;
  }

  /**
   * Disable a protocol
   */
  static disable(protocolId: string): void {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) {
      throw new Error(`Protocol ${protocolId} not found`);
    }
    protocol.enabled = false;
  }
}
