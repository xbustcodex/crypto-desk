import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config(); // also local typescript/.env

function num(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export const config = {
  initialEquityUsd: num("INITIAL_EQUITY_USD", 10_000),
  maxBtcSpreadPct: num("MAX_BTC_SPREAD_PCT", 0.003),
  maxEquityPct: num("MAX_EQUITY_PCT", 0.4),
  maxSlippage: num("MAX_SLIPPAGE", 0.02),
  hardStop: num("HARD_STOP", -0.06),
  solanaRpcUrl:
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  evmRpcUrl: process.env.EVM_RPC_URL || "",
  paperMode: bool("PAPER_MODE", true),
  decisionLogPath: process.env.DECISION_LOG_PATH || "decisions.jsonl",
  btcIntervalMs: num("BTC_INTERVAL_MS", 1000),
} as const;

export type Config = typeof config;
