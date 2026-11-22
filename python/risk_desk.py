"""Risk sizing + DeskManager with equity tracking."""
from __future__ import annotations
import json
import time
from typing import Any, Callable

from equity import EquityTracker

MAX_EQUITY_PCT = 0.40
MAX_SLIPPAGE = 0.02
HARD_STOP = -0.06


class RiskAgent:
    def __init__(self, equity: EquityTracker, publish: Callable[[str, Any], Any]):
        self.equity = equity
        self.publish = publish

    async def on_proposal(self, prop: dict) -> None:
        snap = self.equity.snapshot()
        max_size = snap.total_equity_usd * MAX_EQUITY_PCT
        available = snap.available_usd
        size = min(float(prop.get("size_usd", 0)), max_size, available)
        notes = []

        if prop.get("size_usd", 0) > max_size:
            notes.append(f"sized down to {max_size:.2f} (40% equity)")
        if size <= 0:
            await self._reject(prop, "no available equity")
            return
        if float(prop.get("expected_slippage", 0)) > MAX_SLIPPAGE:
            await self._reject(prop, f"slippage > {MAX_SLIPPAGE}")
            return

        stop = float(prop.get("stop_pct", HARD_STOP))
        if stop > HARD_STOP:  # looser than -6% → tighten
            stop = HARD_STOP

        risked = {
            **prop,
            "size_usd": size,
            "stop_pct": stop,
            "risk_notes": "; ".join(notes),
        }
        await self.publish("proposals_risked", risked)

    async def _reject(self, prop: dict, reason: str) -> None:
        decision = {
            "approved": False,
            "proposal": prop,
            "final_size_usd": 0,
            "reason": reason,
            "ts": time.time(),
        }
        await self.publish("rejected", decision)
        print(f"[Risk] REJECT {reason}")


class DeskManager:
    def __init__(
        self,
        equity: EquityTracker,
        publish: Callable[[str, Any], Any],
        log_path: str = "decisions.jsonl",
        max_btc_spread_pct: float = 0.003,
    ):
        self.equity = equity
        self.publish = publish
        self.log_path = log_path
        self.max_btc_spread_pct = max_btc_spread_pct
        self.halted = False

    async def on_btc_tick(self, tick: dict) -> None:
        spread = tick.get("spread_pct")
        if spread is not None and spread > self.max_btc_spread_pct:
            if not self.halted:
                print(f"[Desk] halting – BTC spread {spread:.4%}")
            self.halted = True
        elif (
            self.halted
            and spread is not None
            and spread < self.max_btc_spread_pct * 0.7
        ):
            self.halted = False
            print("[Desk] resuming – BTC spread normalized")

    async def on_risked(self, prop: dict) -> None:
        if self.halted:
            await self._decide(False, prop, 0, "desk halted")
            return
        rug = prop.get("rug") or {}
        if not rug.get("passed"):
            await self._decide(False, prop, 0, rug.get("reason", "rug failed"))
            return
        if float(prop.get("expected_slippage", 0)) > MAX_SLIPPAGE:
            await self._decide(False, prop, 0, "slippage > 2%")
            return
        if float(prop.get("size_usd", 0)) > self.equity.total_equity * MAX_EQUITY_PCT + 1e-6:
            await self._decide(False, prop, 0, "exceeds 40% equity")
            return

        reason = " | ".join(
            filter(
                None,
                [
                    "Desk APPROVED",
                    prop.get("reason"),
                    prop.get("risk_notes"),
                    f"rug: {rug.get('reason')}",
                    f"size={prop.get('size_usd'):.2f}",
                    f"stop={prop.get('stop_pct')}",
                ],
            )
        )
        await self._decide(True, prop, float(prop["size_usd"]), reason)

    async def _decide(
        self, approved: bool, prop: dict, final_size: float, reason: str
    ) -> None:
        decision = {
            "approved": approved,
            "proposal": prop,
            "final_size_usd": final_size,
            "reason": reason,
            "ts": time.time(),
        }
        with open(self.log_path, "a") as f:
            f.write(json.dumps(decision) + "\n")
        topic = "approved" if approved else "rejected"
        await self.publish(topic, decision)
        print(f"[Desk] {'APPROVE' if approved else 'REJECT'} {reason}")

    def never_withdraw(self) -> None:
        raise RuntimeError(
            "Withdrawals are permanently disabled by DeskManager policy"
        )

    def halt(self, reason: str = "manual") -> None:
        self.halted = True
        print(f"[Desk] manual halt: {reason}")

    def resume(self) -> None:
        self.halted = False
        print("[Desk] resumed")
