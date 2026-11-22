export type Chain = "solana" | "evm";

export interface BTCPriceTick {
  ts: number;
  binance: number | null;
  bybit: number | null;
  coinbase: number | null;
  mid: number | null;
  spread_pct: number | null;
  source_count: number;
}

export interface TokenCandidate {
  chain: Chain;
  address: string;
  symbol?: string;
  pair_address?: string;
  source: string;
  meta?: Record<string, unknown>;
}

export interface RugReport {
  chain: Chain;
  address: string;
  passed: boolean;
  mint_authority_revoked?: boolean | null;
  freeze_authority_disabled?: boolean | null;
  lp_locked_or_burned?: boolean | null;
  lp_locked_pct?: number | null;
  honeypot_risk?: boolean | null;
  details?: Record<string, unknown>;
  reason: string;
}

export interface TradeProposal {
  candidate: TokenCandidate;
  side: "buy" | "sell";
  size_usd: number;
  expected_slippage: number;
  stop_pct: number;
  reason: string;
  limit_price?: number;
  rug?: RugReport;
  whale_score?: number;
  hype_score?: number;
  risk_notes?: string;
}

export interface Decision {
  approved: boolean;
  proposal: TradeProposal;
  final_size_usd: number;
  reason: string;
  ts: number;
}

export interface Position {
  id: string;
  candidate: TokenCandidate;
  entry_price: number;
  size_usd: number;
  stop_price: number;
  opened_ts: number;
  reason: string;
}

export interface EquitySnapshot {
  ts: number;
  totalEquityUsd: number;
  availableUsd: number;
  openExposureUsd: number;
  source: string;
}
