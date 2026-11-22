import { MessageBus } from "./bus";
import { EquityTracker } from "./equity";
import { TradeProposal, Decision } from "./messages";
import { config } from "./config";
import { logger } from "./utils/logger";

export const MAX_EQUITY_PCT = config.maxEquityPct;
export const MAX_SLIPPAGE = config.maxSlippage;
export const HARD_STOP = config.hardStop;

export class RiskAgent {
  constructor(
    private bus: MessageBus,
    private equity: EquityTracker
  ) {
    this.bus.subscribe<TradeProposal>("proposals_raw", (p) => this.onProposal(p));
    logger.info(
      "Risk",
      `limits equityPct=${MAX_EQUITY_PCT} slippage=${MAX_SLIPPAGE} hardStop=${HARD_STOP}`
    );
  }

  private async onProposal(prop: TradeProposal) {
    const snap = this.equity.getSnapshot();
    const maxSize = snap.totalEquityUsd * MAX_EQUITY_PCT;
    const availableCap = snap.availableUsd;

    let size = Math.min(prop.size_usd, maxSize, availableCap);
    const notes: string[] = [];

    if (prop.size_usd > maxSize) {
      notes.push(
        `sized down from ${prop.size_usd.toFixed(2)} to ${maxSize.toFixed(2)} (40% equity cap)`
      );
    }
    if (size > availableCap) {
      notes.push(`capped by available equity ${availableCap.toFixed(2)}`);
      size = availableCap;
    }
    if (size <= 0) {
      await this.reject(prop, "no available equity");
      return;
    }
    if (prop.expected_slippage > MAX_SLIPPAGE) {
      await this.reject(
        prop,
        `expected slippage ${prop.expected_slippage} > ${MAX_SLIPPAGE}`
      );
      return;
    }

    const enforcedStop =
      prop.stop_pct > HARD_STOP ? HARD_STOP : prop.stop_pct;

    if (prop.stop_pct > HARD_STOP) {
      notes.push(`stop tightened from ${prop.stop_pct} to ${HARD_STOP}`);
    }

    const risked: TradeProposal = {
      ...prop,
      size_usd: size,
      stop_pct: enforcedStop,
      risk_notes: notes.join("; ") || prop.risk_notes || "",
    };

    logger.info(
      "Risk",
      `sized ${size.toFixed(2)} stop=${enforcedStop} for ${prop.candidate.address}`
    );
    await this.bus.publish("proposals_risked", risked);
  }

  private async reject(prop: TradeProposal, reason: string) {
    const decision: Decision = {
      approved: false,
      proposal: prop,
      final_size_usd: 0,
      reason,
      ts: Date.now() / 1000,
    };
    await this.bus.publish("rejected", decision);
    logger.warn("Risk", `REJECT ${reason}`);
  }
}
