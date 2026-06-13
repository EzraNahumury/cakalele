import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SUI_RPC } from "./config.mjs";

const client = new SuiJsonRpcClient({ url: SUI_RPC });

// Selaras dgn pundit::profile relationship_state
export const STATE_NAMES = ["Skeptis", "Rival", "Naik", "Respek", "Oracle"];

/** Read a PunditProfile shared object's derived state from Sui mainnet. */
export async function getProfile(profileId) {
  const o = await client.getObject({ id: profileId, options: { showContent: true } });
  const f = o?.data?.content?.fields;
  if (!f) throw new Error("PunditProfile not found: " + profileId);
  const state = Number(f.relationship_state);
  return {
    owner: f.owner,
    respect: Number(f.respect_score),
    state,
    stateName: STATE_NAMES[state] ?? String(state),
    total: Number(f.total_predictions),
    correct: Number(f.correct),
    wrong: Number(f.wrong),
  };
}
