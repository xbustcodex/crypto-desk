import { MessageBus } from "./bus";
import { EquityTracker } from "./equity";
import { RiskAgent } from "./risk";
import { DeskManager } from "./deskManager";
import { SniperAgent } from "./sniper";
import { ExitAgent } from "./exit";
import { startBtcWatcher } from "./btcWatcher";
import { ScannerAgent, RugAgent, WhaleAgent, HypeAgent } from "./agents";
import { TradeProposal, TokenCandidate } from "./messages";
import { config } from "./config";
import { logger } from "./utils/logger";

async function main() {
  logger.info("Main", `starting crypto-desk v0.2 paper=${config.paperMode}`);

  const bus = new MessageBus();
  const equity = new EquityTracker(config.initialEquityUsd, "config");

  new RiskAgent(bus, equity);
  const desk = new DeskManager(bus, equity);

  const scanner = new ScannerAgent(bus);
  new RugAgent(bus);
  new WhaleAgent(bus);
  new HypeAgent(bus);
  scanner.start();

  const getMid = async (_c: TokenCandidate) => 1.0;
  const executeBuy = async (args: {
    candidate: TokenCandidate;
    sizeUsd: number;
    limitPrice: number;
    reason: string;
  }) => {
    logger.info("PaperBuy", `${args.candidate.address} size=${args.sizeUsd} limit=${args.limitPrice}`);
    return { id: `pos-${Date.now()}`, price: args.limitPrice * 0.999 };
  };
  const executeSell = async (args: {
    position: { id: string };
    limitPrice: number;
    reason: string;
  }) => {
    logger.info("PaperSell", `${args.position.id} limit=${args.limitPrice} | ${args.reason}`);
  };

  new SniperAgent(bus, equity, executeBuy, getMid);
  new ExitAgent(bus, equity, executeSell, getMid);

  startBtcWatcher(async (tick) => {
    await bus.publish("btc_ticks", tick);
  });

  setTimeout(async () => {
    const candidate: TokenCandidate = {
      chain: "solana",
      address: "So11111111111111111111111111111111111111112",
      symbol: "WSOL",
      source: "demo",
      meta: { note: "demo — LP check will fail closed without pair lock data" },
    };
    await scanner.emit(candidate);

    const proposal: TradeProposal = {
      candidate,
      side: "buy",
      size_usd: config.initialEquityUsd * 0.5,
      expected_slippage: 0.015,
      stop_pct: -0.05,
      reason: "demo signal (pre-cleared rug for pipeline test)",
      rug: {
        chain: "solana",
        address: candidate.address,
        passed: true,
        mint_authority_revoked: true,
        freeze_authority_disabled: true,
        lp_locked_or_burned: true,
        lp_locked_pct: 1,
        honeypot_risk: false,
        reason: "demo rug pass",
        checked_at: Date.now() / 1000,
      },
    };
    await bus.publish("proposals_raw", proposal);
  }, 4000);

  void desk;
  logger.info("Main", "desk running — Ctrl+C to stop");
}

main().catch((e) => {
  logger.error("Main", "fatal", e);
  process.exit(1);
});
