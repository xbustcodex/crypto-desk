import { MessageBus } from "./bus";
import { EquityTracker } from "./equity";
import { TradeProposal, Decision, BTCPriceTick } from "./messages";
import { MAX_EQUITY_PCT, MAX_SLIPPAGE } from "./risk";
import { config } from "./config";
import { logger } from "./utils/logger";
import * as fs from "fs";

export class DeskManager {
  halted = false;
  private maxBtcSpreadPct = config.maxBtcSpreadPct;
  private logPath = config.decisionLogPath;

  constructor(
    private bus: MessageBus,
    private equity: EquityTracker
  ) {
    this.bus.subscribe<TradeProposal>("proposals_risked", (p) => this.onRisked(p));
    this.bus.subscribe<BTCPriceTick>("btc_ticks", (t) => this.onBtc(t));
    logger.info("Desk", `ready log=${this.logPath} maxSpread=${this.maxBtcSpreadPct}`);
  }

  private async onBtc(tick: BTCPriceTick) {
    if (tick.spread_pct != null && tick.spread_pct > this.maxBtcSpreadPct) {
      if (!this.halted) {
        logger.warn(
          "Desk",
          `halting new entries – BTC spread ${(tick.spread_pct * 100).toFixed(3)}%`
        );
      }
      this.halted = true;
    } else if (
      this.halted &&
      tick.spread_pct != null &&
      tick.spread_pct < this.maxBtcSpreadPct * 0.7
    ) {
      this.halted = false;
      logger.info("Desk", "resuming – BTC spread normalized");
    }
  }

  private async onRisked(prop: TradeProposal) {
    if (this.halted) {
      await this.decide(false, prop, 0, "desk halted (BTC spread or manual)");
      return;
    }
    if (!prop.rug || !prop.rug.passed) {
      await this.decide(
        false,
        prop,
        0,
        prop.rug?.reason ?? "missing or failed rug check"
      );
      return;
    }
    if (prop.expected_slippage > MAX_SLIPPAGE) {
      await this.decide(false, prop, 0, "slippage above 2%");
      return;
    }
    if (prop.size_usd > this.equity.totalEquity * MAX_EQUITY_PCT + 1e-6) {
      await this.decide(false, prop, 0, "exceeds 40% equity after risk sizing");
      return;
    }

    const reason = [
      "Desk APPROVED",
      prop.reason,
      prop.risk_notes,
      `rug: ${prop.rug.reason}`,
      `size=${prop.size_usd.toFixed(2)}`,
      `stop=${prop.stop_pct}`,
    ]
      .filter(Boolean)
      .join(" | ");

    await this.decide(true, prop, prop.size_usd, reason);
  }

  private async decide(
    approved: boolean,
    prop: TradeProposal,
    finalSize: number,
    reason: string
  ) {
    const decision: Decision = {
      approved,
      proposal: prop,
      final_size_usd: finalSize,
      reason,
      ts: Date.now() / 1000,
    };
    this.appendLog(decision);
    if (approved) {
      await this.bus.publish("approved", decision);
      logger.info("Desk", `APPROVE ${reason}`);
    } else {
      await this.bus.publish("rejected", decision);
      logger.warn("Desk", `REJECT ${reason}`);
    }
  }

  private appendLog(d: Decision) {
    try {
      fs.appendFileSync(this.logPath, JSON.stringify(d) + "\n");
    } catch (e) {
      logger.error("Desk", "failed to write decision log", e);
    }
  }

  neverWithdraw(): never {
    throw new Error(
      "Withdrawals are permanently disabled by DeskManager policy"
    );
  }

  halt(reason = "manual") {
    this.halted = true;
    logger.warn("Desk", `manual halt: ${reason}`);
  }

  resume() {
    this.halted = false;
    logger.info("Desk", "resumed");
  }
}
