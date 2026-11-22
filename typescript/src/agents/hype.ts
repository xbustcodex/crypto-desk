import { MessageBus } from "../bus";
import { TokenCandidate, HypeSignal } from "../messages";
import { logger } from "../utils/logger";

/**
 * HypeAgent — soft social/narrative score (stub).
 * Never use as sole entry reason; Risk + Rug + Desk still gate.
 */
export class HypeAgent {
  constructor(private bus: MessageBus) {
    this.bus.subscribe<TokenCandidate>("candidates", (c) => this.onCandidate(c));
  }

  private async onCandidate(candidate: TokenCandidate) {
    const signal: HypeSignal = {
      candidate,
      score: 0.5,
      reason: "hype agent stub — no live social feed",
    };
    logger.debug("Hype", signal.reason);
    await this.bus.publish("hype_signals", signal);
  }
}
