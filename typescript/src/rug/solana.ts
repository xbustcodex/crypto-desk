import { Chain, RugReport, TokenCandidate } from "../messages";
import { logger } from "../utils/logger";
import { config } from "../config";

const BURN_ADDRESSES = new Set([
  "1nc1nerator11111111111111111111111111111111",
  "11111111111111111111111111111111",
]);

export const RAYDIUM_LOCK_PROGRAM =
  "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE";

/**
 * SolanaRugChecker
 *
 * Production path should:
 * 1. getAccountInfo(mint, jsonParsed) → mintAuthority / freezeAuthority === null
 * 2. Resolve pool → lpMint → largest holders
 * 3. Sum burn + known lock-program balances / supply ≥ threshold (e.g. 95%)
 * 4. Optional: sell simulation / external honeypot signal
 */
export class SolanaRugChecker {
  constructor(private rpcUrl: string = config.solanaRpcUrl) {}

  async check(candidate: TokenCandidate): Promise<RugReport> {
    const address = candidate.address;
    const details: Record<string, unknown> = { rpc: this.rpcUrl };

    let mintOk: boolean | null = null;
    let freezeOk: boolean | null = null;
    let lpOk: boolean | null = null;
    let lpPct: number | null = null;
    let honeypot: boolean | null = null;

    try {
      const auth = await this.checkMintFreeze(address);
      mintOk = auth.mintRevoked;
      freezeOk = auth.freezeDisabled;
      details.mint = auth.raw;
    } catch (e) {
      logger.warn("SolanaRug", `mint/freeze check failed for ${address}`, e);
      details.mintError = String(e);
    }

    if (candidate.pair_address) {
      try {
        const lp = await this.checkLpLockOutline(candidate.pair_address);
        lpOk = lp.passed;
        lpPct = lp.pct;
        details.lp = lp.details;
      } catch (e) {
        logger.warn("SolanaRug", `LP check failed for ${candidate.pair_address}`, e);
        details.lpError = String(e);
      }
    } else {
      details.lp = "no pair_address — LP check skipped";
      lpOk = false;
    }

    honeypot = false;

    const failures: string[] = [];
    if (mintOk === false) failures.push("mint authority still set");
    if (freezeOk === false) failures.push("freeze authority still set");
    if (lpOk === false)
      failures.push(
        lpPct != null
          ? `LP only ${(lpPct * 100).toFixed(1)}% locked/burned`
          : "LP not verified locked/burned"
      );
    if (honeypot === true) failures.push("honeypot risk");

    const passed =
      mintOk === true && freezeOk === true && lpOk === true && honeypot !== true;

    return {
      chain: "solana" as Chain,
      address,
      passed,
      mint_authority_revoked: mintOk,
      freeze_authority_disabled: freezeOk,
      lp_locked_or_burned: lpOk,
      lp_locked_pct: lpPct,
      honeypot_risk: honeypot,
      details,
      reason: passed
        ? "mint/freeze revoked + LP locked/burned"
        : failures.join("; ") || "rug checks incomplete",
      checked_at: Date.now() / 1000,
    };
  }

  async checkMintFreeze(mint: string): Promise<{
    mintRevoked: boolean;
    freezeDisabled: boolean;
    raw: unknown;
  }> {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [mint, { encoding: "jsonParsed" }],
    };
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const json = (await res.json()) as {
      result?: {
        value?: { data?: { parsed?: { info?: Record<string, unknown> } } };
      };
      error?: unknown;
    };
    if (json.error) throw new Error(JSON.stringify(json.error));
    const info = json.result?.value?.data?.parsed?.info;
    if (!info) throw new Error("mint account not found or not parseable");

    const mintRevoked = info.mintAuthority == null;
    const freezeDisabled = info.freezeAuthority == null;
    return { mintRevoked, freezeDisabled, raw: info };
  }

  async checkLpLockOutline(poolOrLpMint: string): Promise<{
    passed: boolean;
    pct: number | null;
    details: Record<string, unknown>;
  }> {
    return {
      passed: false,
      pct: null,
      details: {
        note: "LP holder indexing not enabled in skeleton — wire RPC/indexer",
        poolOrLpMint,
        knownLockProgram: RAYDIUM_LOCK_PROGRAM,
        burnAddresses: [...BURN_ADDRESSES],
      },
    };
  }
}
