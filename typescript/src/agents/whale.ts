import { MessageBus } from "../bus";
import { TokenCandidate, WhaleSignal } from "../messages";
import { logger } from "../utils/logger";

/**
 * WhaleAgent — large-wallet / smart-money flow score (stub).
 * Wire exchange inflow labels, known whale wallets, or on-chain transfer aggregators.
 */
export class WhaleAgent {
  constructor(private bus: MessageBus) {
    this.bus.subscribe<TokenCandidate>("candidates", (c) => this.onCandidate(c));
  }

  private async onCandidate(candidate: TokenCandidate) {
    const signal: WhaleSignal = {
      candidate,
      score: 0.5,
      reason: "whale agent stub — no live flow data",
    };
    logger.debug("Whale", signal.reason);
    await this.bus.publish("whale_signals", signal);
  }
}
