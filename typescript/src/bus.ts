import { logger } from "./utils/logger";

type Handler<T = unknown> = (msg: T) => void | Promise<void>;

export class MessageBus {
  private subs = new Map<string, Set<Handler>>();
  private messageCount = 0;

  subscribe<T = unknown>(topic: string, handler: Handler<T>): () => void {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set());
    this.subs.get(topic)!.add(handler as Handler);
    return () => this.subs.get(topic)?.delete(handler as Handler);
  }

  async publish<T = unknown>(topic: string, msg: T): Promise<void> {
    this.messageCount += 1;
    const handlers = this.subs.get(topic);
    if (!handlers || handlers.size === 0) {
      logger.debug("Bus", `no subscribers for ${topic}`);
      return;
    }
    for (const h of [...handlers]) {
      try {
        await h(msg);
      } catch (e) {
        logger.error("Bus", `handler error on ${topic}`, e);
      }
    }
  }

  get stats() {
    return {
      messageCount: this.messageCount,
      topics: [...this.subs.keys()],
      subscriberCounts: Object.fromEntries(
        [...this.subs.entries()].map(([k, v]) => [k, v.size])
      ),
    };
  }
}
