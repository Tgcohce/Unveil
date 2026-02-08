/**
 * Real-Time Analyzer
 *
 * Listens to EventBus and auto-runs incremental attacks on new transactions.
 * Builds in-memory indexes for fast lookup and emits match events as they're found.
 */

import { UnveilEventBus } from "../indexer/event-bus";
import { UnveilDatabase } from "../indexer/db";
import { Deposit, SilentSwapInput, ShadowWireTransfer } from "../indexer/types";
import { TimingCorrelationAttack } from "./timing-attack";

export class RealtimeAnalyzer {
  private eventBus: UnveilEventBus;
  private db: UnveilDatabase;
  private timingAttack: TimingCorrelationAttack;

  // In-memory deposit index keyed by amount for fast lookup
  private depositsByAmount: Map<number, Deposit[]> = new Map();
  private allDeposits: Deposit[] = [];

  // SilentSwap sliding window for recent inputs
  private recentSilentSwapInputs: SilentSwapInput[] = [];
  private readonly SILENTSWAP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  constructor(eventBus: UnveilEventBus, db: UnveilDatabase) {
    this.eventBus = eventBus;
    this.db = db;
    this.timingAttack = new TimingCorrelationAttack();
  }

  /**
   * Initialize: build in-memory deposit index from DB, subscribe to events
   */
  start(): void {
    console.log("🔬 RealtimeAnalyzer: Building deposit index...");
    this.buildDepositIndex();
    console.log(`🔬 RealtimeAnalyzer: Indexed ${this.allDeposits.length} deposits`);

    this.eventBus.on("deposit:new", (payload) => this.onNewDeposit(payload));
    this.eventBus.on("withdrawal:new", (payload) => this.onNewWithdrawal(payload));
    this.eventBus.on("shadowwire:transfer", (transfer) => this.onShadowWireTransfer(transfer));
    this.eventBus.on("silentswap:input", (input) => this.onSilentSwapInput(input));
    this.eventBus.on("silentswap:output", (output) => this.onSilentSwapOutput(output));

    console.log("🔬 RealtimeAnalyzer: Listening for events");
  }

  private buildDepositIndex(): void {
    try {
      const deposits = this.db.getDeposits(100000);
      this.allDeposits = deposits;
      this.depositsByAmount.clear();

      for (const deposit of deposits) {
        const key = deposit.amount;
        const existing = this.depositsByAmount.get(key) || [];
        existing.push(deposit);
        this.depositsByAmount.set(key, existing);
      }
    } catch {
      console.log("🔬 RealtimeAnalyzer: No existing deposits to index");
    }
  }

  /**
   * On new deposit: add to index, emit metrics update
   */
  private onNewDeposit(payload: { deposit: Deposit; protocol: string }): void {
    const { deposit } = payload;
    this.allDeposits.push(deposit);

    const key = deposit.amount;
    const existing = this.depositsByAmount.get(key) || [];
    existing.push(deposit);
    this.depositsByAmount.set(key, existing);

    this.eventBus.emit("metrics:updated", { protocol: "Privacy Cash" });
  }

  /**
   * On new withdrawal: run timing correlation attack against indexed deposits
   */
  private onNewWithdrawal(payload: { withdrawal: any; protocol: string }): void {
    const { withdrawal } = payload;

    if (this.allDeposits.length === 0) return;

    const result = this.timingAttack.analyzeWithdrawal(withdrawal, this.allDeposits);

    if (result.likelySources.length > 0 && result.anonymitySet <= 20) {
      this.eventBus.emit("match:found", {
        type: "timing_attack",
        match: {
          withdrawal: {
            signature: result.withdrawal.signature,
            amount: result.withdrawal.amount,
            timestamp: result.withdrawal.timestamp,
          },
          anonymitySet: result.anonymitySet,
          vulnerabilityLevel: result.vulnerabilityLevel,
          topSource: result.likelySources[0]
            ? {
                depositSignature: result.likelySources[0].deposit.signature,
                confidence: result.likelySources[0].confidence,
                timeDelta: result.likelySources[0].timeDelta,
              }
            : null,
        },
        protocol: "Privacy Cash",
      });
    }
  }

  /**
   * On ShadowWire transfer: check if both sender/recipient are visible
   */
  private onShadowWireTransfer(transfer: ShadowWireTransfer): void {
    const hasVisibleSender =
      transfer.sender && transfer.sender !== "unknown" && transfer.sender !== "pool";
    const hasVisibleRecipient =
      transfer.recipient && transfer.recipient !== "unknown" && transfer.recipient !== "pool";

    if (hasVisibleSender && hasVisibleRecipient) {
      this.eventBus.emit("match:found", {
        type: "address_link",
        match: {
          sender: transfer.sender,
          recipient: transfer.recipient,
          signature: transfer.signature,
          timestamp: transfer.timestamp,
          confidence: 100,
          anonymitySet: 1,
        },
        protocol: "ShadowWire",
      });
    }
  }

  /**
   * On SilentSwap input: add to sliding window
   */
  private onSilentSwapInput(input: SilentSwapInput): void {
    this.recentSilentSwapInputs.push(input);

    // Clean old entries outside window
    const cutoff = Date.now() - this.SILENTSWAP_WINDOW_MS;
    this.recentSilentSwapInputs = this.recentSilentSwapInputs.filter(
      (i) => i.timestamp > cutoff,
    );
  }

  /**
   * On SilentSwap output: scan recent inputs for timing+amount match
   */
  private onSilentSwapOutput(output: { timestamp: number; amount: number; signature: string; destinationWallet: string }): void {
    const EXPECTED_FEE_RATE = 0.01;
    const FEE_TOLERANCE = 0.005;
    const MIN_TIME_DELTA = 30 * 1000;
    const MAX_TIME_DELTA = 5 * 60 * 1000;

    for (const input of this.recentSilentSwapInputs) {
      const timeDelta = output.timestamp - input.timestamp;
      if (timeDelta < MIN_TIME_DELTA || timeDelta > MAX_TIME_DELTA) continue;

      const amountRatio = output.amount / input.amount;
      const expectedRatio = 1 - EXPECTED_FEE_RATE;
      const deviation = Math.abs(amountRatio - expectedRatio);

      if (deviation <= FEE_TOLERANCE) {
        const confidence = Math.round(Math.max(0, 1 - deviation / 0.02) * 100);
        if (confidence > 60) {
          this.eventBus.emit("match:found", {
            type: "amount_correlation",
            match: {
              inputSignature: input.signature,
              outputSignature: output.signature,
              timeDeltaSeconds: Math.round(timeDelta / 1000),
              amountRatio,
              confidence,
            },
            protocol: "SilentSwap",
          });
        }
      }
    }
  }
}
