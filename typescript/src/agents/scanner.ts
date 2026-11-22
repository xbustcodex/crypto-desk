import { MessageBus } from "../bus";
import { TokenCandidate } from "../messages";
import { logger } from "../utils/logger";

/**
 * ScannerAgent — surfaces candidates.
 * Replace the demo loop with real new-pair / volume feeds (Birdeye, DexScreener, on-chain logs).
 */
export class ScannerAgent {
  private running = false;

  constructor(private bus: MessageBus) {}

  start(intervalMs = 15_000) {
    if (this.running) return;
    this.running = true;
    logger.info("Scanner", "started");
    this.loop(intervalMs);
  }

  stop() {
    this.running = false;
  }

  /** Push a candidate from an external feed */
  async emit(candidate: TokenCandidate) {
    logger.info("Scanner", `candidate ${candidate.chain}:${candidate.address}`);
    await this.bus.publish("candidates", candidate);
  }

  private async loop(intervalMs: number) {
    while (this.running) {
      // Demo: no automatic spam. Use emit() or wire a real source.
      await sleep(intervalMs);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
