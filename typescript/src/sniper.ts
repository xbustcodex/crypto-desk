import { MessageBus } from "./bus";
import { EquityTracker } from "./equity";
import { Decision, Position } from "./messages";
import { MAX_SLIPPAGE } from "./risk";

export type BuyExecutor = (args: {
  candidate: Decision["proposal"]["candidate"];
  sizeUsd: number;
  limitPrice: number;
  reason: string;
}) => Promise<{ id: string; price: number }>;

export class SniperAgent {
  constructor(
    private bus: MessageBus,
    private equity: EquityTracker,
    private executeBuy: BuyExecutor,
    private getMidPrice: (
      candidate: Decision["proposal"]["candidate"]
    ) => Promise<number>
  ) {
    this.bus.subscribe<Decision>("approved", (d) => this.onApproved(d));
  }

  private async onApproved(decision: Decision) {
    if (!decision.approved || decision.proposal.side !== "buy") return;
    const prop = decision.proposal;

    try {
      const mid = await this.getMidPrice(prop.candidate);
      const slip = Math.min(prop.expected_slippage || 0, MAX_SLIPPAGE);
      const limit = mid * (1 + slip);

      const fill = await this.executeBuy({
        candidate: prop.candidate,
        sizeUsd: decision.final_size_usd,
        limitPrice: limit,
        reason: decision.reason,
      });

      const stopPrice = fill.price * (1 + prop.stop_pct); // stop_pct is negative
      const pos: Position = {
        id: fill.id,
        candidate: prop.candidate,
        entry_price: fill.price,
        size_usd: decision.final_size_usd,
        stop_price: stopPrice,
        opened_ts: Date.now() / 1000,
        reason: decision.reason,
      };

      this.equity.onPositionOpened(pos);
      await this.bus.publish("positions_opened", pos);
      console.log(
        `[Sniper] opened ${pos.id} @ ${pos.entry_price} | ${pos.reason}`
      );
    } catch (e) {
      console.error(`[Sniper] execution failed`, e, decision.reason);
    }
  }
}
