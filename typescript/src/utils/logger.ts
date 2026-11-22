type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: Level = (process.env.LOG_LEVEL as Level) || "info";

function log(level: Level, agent: string, msg: string, extra?: unknown) {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] [${agent}] ${msg}`;
  if (extra !== undefined) {
    console[level === "debug" ? "log" : level](line, extra);
  } else {
    console[level === "debug" ? "log" : level](line);
  }
}

export const logger = {
  debug: (agent: string, msg: string, extra?: unknown) =>
    log("debug", agent, msg, extra),
  info: (agent: string, msg: string, extra?: unknown) =>
    log("info", agent, msg, extra),
  warn: (agent: string, msg: string, extra?: unknown) =>
    log("warn", agent, msg, extra),
  error: (agent: string, msg: string, extra?: unknown) =>
    log("error", agent, msg, extra),
};
