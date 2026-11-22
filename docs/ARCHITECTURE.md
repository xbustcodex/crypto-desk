# Architecture

## Message flow

```
Scanner ──► candidates
                │
                ▼
             RugAgent ──► rug_reports
                │
     Whale + Hype (soft scores)
                │
                ▼
         proposals_raw
                │
                ▼
            RiskAgent ──► proposals_risked | rejected
                │
                ▼
          DeskManager ──► approved | rejected  (+ JSONL log)
                │
                ▼
             Sniper ──► positions_opened
                │
                ▼
              Exit ──► close + reason
```

## Topics

| Topic | Payload |
|-------|---------|
| `btc_ticks` | `BTCPriceTick` |
| `candidates` | `TokenCandidate` |
| `rug_reports` | `{ candidate, report }` |
| `proposals_raw` | `TradeProposal` |
| `proposals_risked` | `TradeProposal` (sized) |
| `approved` / `rejected` | `Decision` |
| `positions_opened` | `Position` |

## Equity model

```
available = totalEquity − openExposure
maxSize   = min(requested, totalEquity × 0.40, available)
```

Equity is **read-only**. There is no withdraw API surface; `DeskManager.neverWithdraw()` throws if called.

## Halt conditions

- BTC cross-exchange spread > configured threshold (default 0.3%)
- Manual `desk.halt(reason)`
- Resume when spread cools or `desk.resume()` is called
