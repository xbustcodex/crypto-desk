import { MessageBus } from "./bus";
import { EquityTracker } from "./equity";
import { Position } from "./messages";
import { HARD_STOP, MAX_SLIPPAGE } from "./risk";

export type SellExecutor = (args: {
  position: Position;
  limitPrice: number;
  reason: string;
}) => Promise<void>;

export class ExitAgent {
  private positions = new Map<string, Position>();

  constructor(
    private bus: MessageBus,
    private equity: EquityTracker,
    private executeSell: SellExecutor,
    private getMidPrice: (candidate: Position["candidate"]) => Promise<number>,
    pollMs = 500
  ) {
    this.bus.subscribe<Position>("positions_opened", (p) => {
      this.positions.set(p.id, p);
    });
    setInterval(() => this.tick(), pollMs);
  }

  private async tick() {
    for (const [id, pos] of this.positions) {
      try {
        const price = await this.getMidPrice(pos.candidate);
        const pnlPct = (price - pos.entry_price) / pos.entry_price;
        const stopHit = price <= pos.stop_price || pnlPct <= HARD_STOP;
        if (stopHit) {
          const reason = `stop hit pnl=${(pnlPct * 100).toFixed(2)}% (hard ${(HARD_STOP * 100).toFixed(0)}%) | entry: ${pos.reason}`;
          await this.close(pos, price, reason);
        }
      } catch (e) {
        console.error(`[Exit] monitor error ${id}`, e);
      }
    }
  }

  private async close(pos: Position, price: number, reason: string) {
    const limit = price * (1 - MAX_SLIPPAGE);
    try {
      await this.executeSell({ position: pos, limitPrice: limit, reason });
      this.positions.delete(pos.id);
      this.equity.onPositionClosed(pos.id);
      console.log(`[Exit] closed ${pos.id} ~${price} | ${reason}`);
    } catch (e) {
      console.error(`[Exit] close failed ${pos.id}`, e);
    }
  }
}
