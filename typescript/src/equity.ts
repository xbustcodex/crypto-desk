import { EquitySnapshot, Position } from "./messages";

/**
 * EquityTracker – single source of truth for sizing.
 * In production, refresh from exchange balances / on-chain wallet (read-only).
 * Never implements withdraw/transfer.
 */
export class EquityTracker {
  private totalEquityUsd: number;
  private openExposureUsd = 0;
  private positions = new Map<string, Position>();
  private source: string;

  constructor(initialEquityUsd: number, source = "manual") {
    this.totalEquityUsd = initialEquityUsd;
    this.source = source;
  }

  /** Replace with real balance reader (CEX account or on-chain SOL/USDC). */
  async refreshFromExchange(): Promise<void> {
    // TODO: call exchange balance API or RPC – read only
  }

  setTotalEquity(usd: number, source = "manual") {
    this.totalEquityUsd = usd;
    this.source = source;
  }

  onPositionOpened(pos: Position) {
    this.positions.set(pos.id, pos);
    this.openExposureUsd += pos.size_usd;
  }

  onPositionClosed(posId: string) {
    const pos = this.positions.get(posId);
    if (!pos) return;
    this.openExposureUsd = Math.max(0, this.openExposureUsd - pos.size_usd);
    this.positions.delete(posId);
  }

  getSnapshot(): EquitySnapshot {
    return {
      ts: Date.now() / 1000,
      totalEquityUsd: this.totalEquityUsd,
      availableUsd: Math.max(0, this.totalEquityUsd - this.openExposureUsd),
      openExposureUsd: this.openExposureUsd,
      source: this.source,
    };
  }

  get totalEquity() {
    return this.totalEquityUsd;
  }

  get available() {
    return Math.max(0, this.totalEquityUsd - this.openExposureUsd);
  }
}
