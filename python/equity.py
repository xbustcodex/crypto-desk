"""Equity tracking – read-only. Never withdraw."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict
import time


@dataclass
class EquitySnapshot:
    ts: float
    total_equity_usd: float
    available_usd: float
    open_exposure_usd: float
    source: str


@dataclass
class Position:
    id: str
    size_usd: float


class EquityTracker:
    def __init__(self, initial_equity_usd: float, source: str = "manual"):
        self._total = float(initial_equity_usd)
        self._open_exposure = 0.0
        self._positions: Dict[str, Position] = {}
        self.source = source

    def set_total_equity(self, usd: float, source: str = "manual") -> None:
        self._total = float(usd)
        self.source = source

    async def refresh_from_exchange(self) -> None:
        """Implement CEX or on-chain balance read (read-only)."""
        pass

    def on_position_opened(self, pos: Position) -> None:
        self._positions[pos.id] = pos
        self._open_exposure += pos.size_usd

    def on_position_closed(self, pos_id: str) -> None:
        pos = self._positions.pop(pos_id, None)
        if pos:
            self._open_exposure = max(0.0, self._open_exposure - pos.size_usd)

    def snapshot(self) -> EquitySnapshot:
        return EquitySnapshot(
            ts=time.time(),
            total_equity_usd=self._total,
            available_usd=max(0.0, self._total - self._open_exposure),
            open_exposure_usd=self._open_exposure,
            source=self.source,
        )

    @property
    def total_equity(self) -> float:
        return self._total

    @property
    def available(self) -> float:
        return max(0.0, self._total - self._open_exposure)
