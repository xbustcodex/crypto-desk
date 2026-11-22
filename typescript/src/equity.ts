import { EquitySnapshot, Position } from "./messages";
import { logger } from "./utils/logger";

/**
 * EquityTracker – single source of truth for sizing.
 * Read-only: never implements withdraw/transfer.
 */
export class EquityTracker {
  private totalEquityUsd: number;
  private openExposureUsd = 0;
  private positions = new Map<string, Position>();
  private source: string;

  constructor(initialEquityUsd: number, source = "manual") {
    this.totalEquityUsd = initialEquityUsd;
    this.source = source;
    logger.info("Equity", `initialized total=${initialEquityUsd} source=${source}`);
  }

  async refreshFromExchange(): Promise<void> {
    logger.debug("Equity", "refreshFromExchange not wired");
  }

  setTotalEquity(usd: number, source = "manual") {
    this.totalEquityUsd = usd;
    this.source = source;
  }

  onPositionOpened(pos: Position) {
    this.positions.set(pos.id, pos);
    this.openExposureUsd += pos.size_usd;
    logger.info(
      "Equity",
      `opened ${pos.id} size=${pos.size_usd} exposure=${this.openExposureUsd}`
    );
  }

  onPositionClosed(posId: string) {
    const pos = this.positions.get(posId);
    if (!pos) return;
    this.openExposureUsd = Math.max(0, this.openExposureUsd - pos.size_usd);
    this.positions.delete(posId);
    logger.info("Equity", `closed ${posId} exposure=${this.openExposureUsd}`);
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

  get openPositions() {
    return [...this.positions.values()];
  }
}
