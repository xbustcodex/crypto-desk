import { Chain, RugReport, TokenCandidate } from "../messages";
import { logger } from "../utils/logger";

/**
 * EVM rug outline (owner renounced, LP lock via known lockers, honeypot heuristics).
 * Wire ethers/viem + GoPlus / Honeypot.is style signals for production.
 */
export class EvmRugChecker {
  async check(candidate: TokenCandidate): Promise<RugReport> {
    logger.info("EvmRug", `check stub for ${candidate.address}`);
    return {
      chain: "evm" as Chain,
      address: candidate.address,
      passed: false,
      mint_authority_revoked: null,
      freeze_authority_disabled: null,
      lp_locked_or_burned: null,
      lp_locked_pct: null,
      honeypot_risk: null,
      details: {
        note: "EVM checker is a stub — implement owner/LP/honeypot reads",
      },
      reason: "EVM rug checker not implemented",
      checked_at: Date.now() / 1000,
    };
  }
}
