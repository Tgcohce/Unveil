/**
 * Event Bus for real-time communication between indexers, analyzers, and WebSocket server.
 * Typed EventEmitter that bridges batch indexing → live dashboard updates.
 */

import { EventEmitter } from "events";
import {
  Deposit,
  Withdrawal,
  ShadowWireTransfer,
  SilentSwapInput,
  SilentSwapOutput,
} from "./types";

export interface UnveilEvents {
  "deposit:new": { deposit: Deposit; protocol: string };
  "withdrawal:new": { withdrawal: Withdrawal; protocol: string };
  "shadowwire:transfer": ShadowWireTransfer;
  "silentswap:input": SilentSwapInput;
  "silentswap:output": SilentSwapOutput;
  "match:found": {
    type: "timing_attack" | "address_link" | "amount_correlation";
    match: any;
    protocol: string;
  };
  "indexer:status": {
    protocol: string;
    status: "starting" | "indexing" | "complete" | "error";
    progress?: string;
    message?: string;
  };
  "metrics:updated": { protocol: string };
}

export type UnveilEventName = keyof UnveilEvents;

export class UnveilEventBus extends EventEmitter {
  emit<K extends UnveilEventName>(event: K, payload: UnveilEvents[K]): boolean {
    return super.emit(event, payload);
  }

  on<K extends UnveilEventName>(
    event: K,
    listener: (payload: UnveilEvents[K]) => void,
  ): this {
    return super.on(event, listener);
  }

  off<K extends UnveilEventName>(
    event: K,
    listener: (payload: UnveilEvents[K]) => void,
  ): this {
    return super.off(event, listener);
  }

  once<K extends UnveilEventName>(
    event: K,
    listener: (payload: UnveilEvents[K]) => void,
  ): this {
    return super.once(event, listener);
  }
}
