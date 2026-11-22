type Handler<T = unknown> = (msg: T) => void | Promise<void>;

export class MessageBus {
  private subs = new Map<string, Set<Handler>>();

  subscribe<T = unknown>(topic: string, handler: Handler<T>): () => void {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set());
    this.subs.get(topic)!.add(handler as Handler);
    return () => this.subs.get(topic)?.delete(handler as Handler);
  }

  async publish<T = unknown>(topic: string, msg: T): Promise<void> {
    const handlers = this.subs.get(topic);
    if (!handlers) return;
    for (const h of handlers) {
      await h(msg);
    }
  }
}
