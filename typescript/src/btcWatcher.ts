import WebSocket from "ws";
import { BTCPriceTick } from "./messages";
import { logger } from "./utils/logger";
import { config } from "./config";

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

function connectWithRetry(
  name: string,
  url: string,
  onOpen: (ws: WebSocket) => void,
  onMessage: (data: unknown) => void
) {
  let delay = 1000;
  const connect = () => {
    try {
      const ws = new WebSocket(url);
      ws.on("open", () => {
        delay = 1000;
        logger.info("BTC", `${name} connected`);
        onOpen(ws);
      });
      ws.on("message", (raw) => {
        try {
          onMessage(JSON.parse(raw.toString()));
        } catch {
          /* ignore */
        }
      });
      ws.on("close", () => {
        logger.warn("BTC", `${name} closed — retry in ${delay}ms`);
        setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30_000);
      });
      ws.on("error", () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      });
    } catch (e) {
      logger.error("BTC", `${name} connect error`, e);
      setTimeout(connect, delay);
      delay = Math.min(delay * 2, 30_000);
    }
  };
  connect();
}

export function startBtcWatcher(
  onTick: TickHandler,
  intervalMs = config.btcIntervalMs
) {
  const cache = new PriceCache();

  connectWithRetry(
    "Binance",
    BINANCE_WS,
    () => {},
    (data: any) => {
      const price = parseFloat(data.c || data.lastPrice || "0");
      if (price > 0) cache.update("binance", price);
    }
  );

  connectWithRetry(
    "Bybit",
    BYBIT_WS,
    (ws) => {
      ws.send(JSON.stringify({ op: "subscribe", args: ["tickers.BTCUSDT"] }));
    },
    (data: any) => {
      if (typeof data.topic === "string" && data.topic.startsWith("tickers")) {
        const price = parseFloat(data.data?.lastPrice || "0");
        if (price > 0) cache.update("bybit", price);
      }
    }
  );

  connectWithRetry(
    "Coinbase",
    COINBASE_WS,
    (ws) => {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          product_ids: ["BTC-USD"],
          channel: "ticker",
        })
      );
    },
    (data: any) => {
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
    }
  );

  setInterval(async () => {
    const tick = cache.snapshot();
    try {
      await onTick(tick);
    } catch (e) {
      logger.error("BTC", "onTick handler error", e);
    }
  }, intervalMs);

  logger.info("BTC", `watcher started interval=${intervalMs}ms`);
  return cache;
}
