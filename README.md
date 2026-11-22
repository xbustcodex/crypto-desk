# Multi-Agent Crypto Desk Skeleton (Solana + EVM)

Hard rules enforced by Risk + DeskManager:

- Max **40%** of equity per trade
- Max **2%** slippage
- Hard stop **−6%**
- Log a reason for every trade / decision
- **Never withdraw funds** (no withdraw/transfer paths)

## Contents

- `typescript/` – full TypeScript versions: BTC WebSocket watcher (Binance / Bybit / Coinbase), message bus, equity tracker, Risk, DeskManager, Sniper, Exit
- `python/` – matching DeskManager + Risk sizing with equity tracking

## TypeScript quick start

```bash
cd typescript
npm install
npx ts-node src/index.ts
```

Paper-trade only until you wire real executors and RPCs.

## Agents

| Agent | Role |
|-------|------|
| Scanner | Discover candidates (stub) |
| Risk | Size ≤40% equity, enforce 2% slippage & −6% stop |
| Desk Manager | Final authority, BTC-spread halt, JSONL log, `neverWithdraw()` |
| Sniper | Slippage-protected entry |
| Exit | Hard-stop / reason-logged exit |
| Rug / Whale / Hype | Interfaces ready; implement against your RPCs/APIs |

## License

MIT – use at your own risk. This is a control skeleton, not production trading software.
