import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SUI_RPC, PUNDIT } from "./config.mjs";

const client = new SuiJsonRpcClient({ url: SUI_RPC });

const decodeBytes = (v) => (Array.isArray(v) ? new TextDecoder().decode(Uint8Array.from(v)) : String(v ?? ""));

/** Prediction receipts for an owner, with resolved verdict (0 pending, 1 correct, 2 wrong). */
export async function getReceipts(owner) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "suix_queryEvents",
    params: [{ MoveEventModule: { package: PUNDIT.packageId, module: "receipt" } }, null, 50, true],
  };
  const r = await fetch(SUI_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await r.json())?.result?.data ?? [];
  const verdicts = new Map();
  for (const e of data) if (e.type.endsWith("::receipt::PredictionResolved")) verdicts.set(String(e.parsedJson.receipt_id), Number(e.parsedJson.verdict));
  const out = [];
  for (const e of data) {
    if (!e.type.endsWith("::receipt::PredictionCommitted")) continue;
    const j = e.parsedJson;
    if (owner && String(j.owner) !== owner) continue;
    const id = String(j.receipt_id);
    out.push({ receiptId: id, matchId: decodeBytes(j.match_id), blobId: decodeBytes(j.blob_id), verdict: verdicts.get(id) ?? 0 });
  }
  return out;
}

// Mirrors pundit::profile relationship_state
export const STATE_NAMES = ["Skeptic", "Rival", "Rising", "Respect", "Oracle"];

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
