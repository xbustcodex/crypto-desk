# Crypto Desk — Multi-Agent Trading Skeleton (Solana + EVM)

Paper-first control architecture for a desk of **8 agents**. Hard risk rules are enforced in code and cannot be bypassed by any single agent.

## Hard rules (always on)

| Rule | Value |
|------|--------|
| Max size per trade | **40%** of equity |
| Max slippage | **2%** |
| Hard stop | **−6%** |
| Reason log | Every approve / reject / exit |
| Withdrawals | **Permanently disabled** |

## Agents

| Agent | Role |
|-------|------|
| **Scanner** | Surfaces token candidates (volume / new pairs) |
| **Rug** | Mint authority, freeze authority, LP lock/burn, honeypot heuristics |
| **Whale** | Large-wallet / flow score (stub + interface) |
| **Hype** | Soft sentiment filter (stub + interface) |
| **Risk** | Sizes to ≤40% equity, enforces slippage & stop |
| **Desk Manager** | Final authority, BTC-spread halt, JSONL journal, `neverWithdraw()` |
| **Sniper** | Slippage-capped entry execution |
| **Exit** | Monitors stops; every close is reason-logged |

## BTC price desk

Live WebSocket comparison every second across:

- Binance (`btcusdt@ticker`)
- Bybit (`tickers.BTCUSDT`)
- Coinbase Advanced Trade (`BTC-USD` ticker)

Wide spreads auto-halt new entries until the market normalizes.

## Quick start (TypeScript)

```bash
git clone https://github.com/xbustcodex/crypto-desk.git
cd crypto-desk/typescript
cp ../.env.example .env   # optional
npm install
npm start                 # paper demo
```

## Quick start (Python)

```bash
cd crypto-desk/python
python -m venv .venv && source .venv/bin/activate
# equity.py + risk_desk.py are the Risk / Desk core
```

## Project layout

```
crypto-desk/
├── README.md
├── LICENSE
├── .env.example
├── docs/ARCHITECTURE.md
├── typescript/src/   (full agent desk + BTC WS + rug)
└── python/           (equity + risk_desk + stubs)
```

## Safety notes

- This is a **control skeleton**, not production trading software.
- Start in **paper mode**. Wire real executors only after you understand sizing, stops, and the never-withdraw guard.
- Honeypot / LP-lock checks are necessary but not sufficient; on-chain state changes.
- Never put withdraw/transfer signing paths in the executor layer.

## License

MIT — use at your own risk.
