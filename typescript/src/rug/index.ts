import { TokenCandidate, RugReport } from "../messages";
import { SolanaRugChecker } from "./solana";
import { EvmRugChecker } from "./evm";

export class RugService {
  private sol = new SolanaRugChecker();
  private evm = new EvmRugChecker();

  async check(candidate: TokenCandidate): Promise<RugReport> {
    if (candidate.chain === "solana") return this.sol.check(candidate);
    return this.evm.check(candidate);
  }
}

export { SolanaRugChecker, RAYDIUM_LOCK_PROGRAM } from "./solana";
export { EvmRugChecker } from "./evm";
