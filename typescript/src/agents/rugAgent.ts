import { MessageBus } from "../bus";
import { TokenCandidate, TradeProposal } from "../messages";
import { RugService } from "../rug";
import { logger } from "../utils/logger";
import { config } from "../config";

/**
 * RugAgent — runs safety checks then builds a raw proposal for Risk.
 */
export class RugAgent {
  private rug = new RugService();

  constructor(private bus: MessageBus) {
    this.bus.subscribe<TokenCandidate>("candidates", (c) => this.onCandidate(c));
  }

  private async onCandidate(candidate: TokenCandidate) {
    try {
      const report = await this.rug.check(candidate);
      await this.bus.publish("rug_reports", { candidate, report });

      if (!report.passed) {
        logger.warn("RugAgent", `FAIL ${candidate.address}: ${report.reason}`);
        return;
      }

      logger.info("RugAgent", `PASS ${candidate.address}: ${report.reason}`);

      const proposal: TradeProposal = {
        candidate,
        side: "buy",
        size_usd: config.initialEquityUsd * 0.1,
        expected_slippage: 0.015,
        stop_pct: config.hardStop,
        reason: `rug-passed: ${report.reason}`,
        rug: report,
      };
      await this.bus.publish("proposals_raw", proposal);
    } catch (e) {
      logger.error("RugAgent", `error checking ${candidate.address}`, e);
    }
  }
}
