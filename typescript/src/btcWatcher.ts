import WebSocket from "ws";
import { BTCPriceTick } from "./messages";

type TickHandler = (tick: BTCPriceTick) => void | Promise<void>;

const BINANCE_WS = "wss://stream.binance.com:9443/ws/btcusdt@ticker";
const BYBIT_WS = "wss://stream.bybit.com/v5/public/spot";
const COINBASE_WS = "wss://advanced-trade-ws.coinbase.com";

class PriceCache {
  binance: number | null = null;
  bybit: number | null = null;
  coinbase: number | null = null;

  update(ex: "binance" | "bybit" | "coinbase", price: number) {
    this[ex] = price;
  }

  snapshot(): BTCPriceTick {
    const prices = [this.binance, this.bybit, this.coinbase].filter(
      (p): p is number => p != null && p > 0
    );
    const mid = prices.length
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : null;
    const spread =
      prices.length >= 2 && mid
        ? (Math.max(...prices) - Math.min(...prices)) / mid
        : null;
    return {
      ts: Date.now() / 1000,
      binance: this.binance,
      bybit: this.bybit,
      coinbase: this.coinbase,
      mid,
      spread_pct: spread,
      source_count: prices.length,
    };
  }
}

function reconnecting(name: string, connectFn: () => void) {
  let delay = 1000;
  const run = () => {
    try {
      connectFn();
    } catch (e) {
      console.error(`[${name}] connect error`, e);
      setTimeout(run, delay);
      delay = Math.min(delay * 2, 30000);
    }
  };
  run();
}

export function startBtcWatcher(onTick: TickHandler, intervalMs = 1000) {
  const cache = new PriceCache();

  // Binance
  reconnecting("Binance", () => {
    const ws = new WebSocket(BINANCE_WS);
    ws.on("open", () => console.log("[Binance] connected"));
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const price = parseFloat(data.c || data.lastPrice || "0");
        if (price > 0) cache.update("binance", price);
      } catch {
        /* ignore parse errors */
      }
    });
    ws.on("close", () =>
      setTimeout(() => reconnecting("Binance", () => {}), 2000)
    );
    ws.on("error", () => ws.close());
  });

  // Bybit
  reconnecting("Bybit", () => {
    const ws = new WebSocket(BYBIT_WS);
    ws.on("open", () => {
      console.log("[Bybit] connected");
      ws.send(JSON.stringify({ op: "subscribe", args: ["tickers.BTCUSDT"] }));
    });
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (
          typeof data.topic === "string" &&
          data.topic.startsWith("tickers")
        ) {
          const price = parseFloat(data.data?.lastPrice || "0");
          if (price > 0) cache.update("bybit", price);
        }
      } catch {
        /* ignore */
      }
    });
    ws.on("close", () =>
      setTimeout(() => reconnecting("Bybit", () => {}), 2000)
    );
    ws.on("error", () => ws.close());
  });

  // Coinbase Advanced Trade (public ticker)
  reconnecting("Coinbase", () => {
    const ws = new WebSocket(COINBASE_WS);
    ws.on("open", () => {
      console.log("[Coinbase] connected");
      ws.send(
        JSON.stringify({
          type: "subscribe",
          product_ids: ["BTC-USD"],
          channel: "ticker",
        })
      );
    });
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.channel === "ticker") {
          for (const ev of data.events || []) {
            for (const t of ev.tickers || []) {
              if (t.product_id === "BTC-USD") {
                const price = parseFloat(t.price || "0");
                if (price > 0) cache.update("coinbase", price);
              }
            }
          }
        }
      } catch {
        /* ignore */
      }
    });
    ws.on("close", () =>
      setTimeout(() => reconnecting("Coinbase", () => {}), 2000)
    );
    ws.on("error", () => ws.close());
  });

  setInterval(async () => {
    const tick = cache.snapshot();
    await onTick(tick);
  }, intervalMs);

  return cache;
}
