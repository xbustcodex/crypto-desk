import { MessageBus } from "./bus";
import { EquityTracker } from "./equity";
import { RiskAgent } from "./risk";
import { DeskManager } from "./deskManager";
import { SniperAgent } from "./sniper";
import { ExitAgent } from "./exit";
import { startBtcWatcher } from "./btcWatcher";
import { TradeProposal, TokenCandidate } from "./messages";

async function main() {
  const bus = new MessageBus();
  const equity = new EquityTracker(10_000); // paper equity – replace with real reader

  new RiskAgent(bus, equity);
  const desk = new DeskManager(bus, equity);
  // desk.neverWithdraw(); // throws if ever called

  // Dummy price + executors for skeleton demo
  const getMid = async (_c: TokenCandidate) => 1.0;
  const executeBuy = async (args: {
    candidate: TokenCandidate;
    sizeUsd: number;
    limitPrice: number;
    reason: string;
  }) => {
    console.log("[PaperBuy]", args);
    return { id: `pos-${Date.now()}`, price: args.limitPrice * 0.999 };
  };
  const executeSell = async (args: {
    position: unknown;
    limitPrice: number;
    reason: string;
  }) => {
    console.log("[PaperSell]", args);
  };

  new SniperAgent(bus, equity, executeBuy, getMid);
  new ExitAgent(bus, equity, executeSell, getMid);

  startBtcWatcher(async (tick) => {
    await bus.publish("btc_ticks", tick);
  });

  // Demo proposal after a short delay
  setTimeout(async () => {
    const candidate: TokenCandidate = {
      chain: "solana",
      address: "So11111111111111111111111111111111111111112",
      source: "demo",
    };
    const proposal: TradeProposal = {
      candidate,
      side: "buy",
      size_usd: 5000, // will be capped by 40% of 10k = 4000
      expected_slippage: 0.015,
      stop_pct: -0.05, // will be tightened to -0.06
      reason: "demo signal",
      rug: {
        chain: "solana",
        address: candidate.address,
        passed: true,
        mint_authority_revoked: true,
        freeze_authority_disabled: true,
        lp_locked_or_burned: true,
        reason: "demo rug pass",
      },
    };
    await bus.publish("proposals_raw", proposal);
  }, 3000);

  console.log("Desk running (paper). Ctrl+C to stop.");
}

main().catch(console.error);
