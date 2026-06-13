// Read pundit on-chain state from Sui mainnet via raw JSON-RPC (version-independent).
import { Transaction } from "@mysten/sui/transactions";

const RPC = "https://fullnode.mainnet.sui.io:443";
const CLOCK = "0x6";
export const PUNDIT_PACKAGE =
  process.env.NEXT_PUBLIC_PUNDIT_PACKAGE_ID ||
  "0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f";
export const PUNDIT_REGISTRY =
  process.env.NEXT_PUBLIC_PUNDIT_REGISTRY_ID ||
  "0xc4f4dd4183f14ca23c8a795a39f84cc5177d45f3536e6b9acc586a3d1db6cf73";

export const STATE_NAMES = ["Skeptic", "Rival", "Rising", "Respect", "Oracle"];
export const suiscan = (kind: "object" | "tx", id: string) =>
  `https://suiscan.xyz/mainnet/${kind === "tx" ? "tx" : "object"}/${id}`;

async function rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

// vector<u8> in event parsedJson arrives as number[] or base64 string
export function bytesToString(v: unknown): string {
  if (Array.isArray(v)) return new TextDecoder().decode(Uint8Array.from(v as number[]));
  if (typeof v === "string") {
    try {
      return new TextDecoder().decode(Uint8Array.from(atob(v), (c) => c.charCodeAt(0)));
    } catch {
      return v;
    }
  }
  return String(v ?? "");
}

export type Profile = {
  respect: number;
  state: number;
  stateName: string;
  correct: number;
  wrong: number;
  total: number;
  owner: string;
};

// ProfileRegistry holds a Table<address,ID>; entries live under the inner Table object's id,
// not the registry's id. Resolve + cache that table id once.
let _registryTableId: string | null = null;
async function registryTableId(): Promise<string | null> {
  if (_registryTableId) return _registryTableId;
  try {
    const res = await rpc<{ data?: { content?: { fields?: { profiles?: { fields?: { id?: { id?: string } } } } } } }>(
      "sui_getObject",
      [PUNDIT_REGISTRY, { showContent: true }],
    );
    _registryTableId = res?.data?.content?.fields?.profiles?.fields?.id?.id ?? null;
    return _registryTableId;
  } catch {
    return null;
  }
}

export async function getProfileIdForOwner(owner: string): Promise<string | null> {
  try {
    const tableId = await registryTableId();
    if (!tableId) return null;
    const res = await rpc<{ data?: { content?: { fields?: { value?: string } } } }>(
      "suix_getDynamicFieldObject",
      [tableId, { type: "address", value: owner }],
    );
    return res?.data?.content?.fields?.value ?? null;
  } catch {
    return null;
  }
}

/** Poll until the registry shows a profile for `owner` (after a create_profile tx). */
export async function waitForProfileId(owner: string, tries = 10, delayMs = 1500): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    const id = await getProfileIdForOwner(owner);
    if (id) return id;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

const enc = (s: string) => Array.from(new TextEncoder().encode(s));

/** Tx: create the caller's PunditProfile (one per wallet). */
export function buildCreateProfileTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PUNDIT_PACKAGE}::profile::create_profile`,
    arguments: [tx.object(PUNDIT_REGISTRY), tx.object(CLOCK)],
  });
  return tx;
}

/** Tx: anchor a prediction receipt (signed by the user). blobId = Walrus blob from remember(). */
export function buildCommitPredictionTx(
  profileId: string,
  matchId: string,
  blobId: string,
  confidence: number,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PUNDIT_PACKAGE}::receipt::commit_prediction`,
    arguments: [
      tx.object(profileId),
      tx.pure.vector("u8", enc(matchId)),
      tx.pure.vector("u8", enc(blobId)),
      tx.pure.u8(confidence),
      tx.object(CLOCK),
    ],
  });
  return tx;
}

export async function getProfile(profileId: string): Promise<Profile | null> {
  const res = await rpc<{ data?: { content?: { fields?: Record<string, string> } } }>("sui_getObject", [
    profileId,
    { showContent: true },
  ]);
  const f = res?.data?.content?.fields;
  if (!f) return null;
  const state = Number(f.relationship_state);
  return {
    respect: Number(f.respect_score),
    state,
    stateName: STATE_NAMES[state] ?? String(state),
    correct: Number(f.correct),
    wrong: Number(f.wrong),
    total: Number(f.total_predictions),
    owner: f.owner,
  };
}

export type Receipt = {
  receiptId: string;
  owner: string;
  matchId: string;
  blobId: string;
  committedAtMs: number;
  txDigest: string;
  verdict?: number; // from PredictionResolved
};

type SuiEvent = {
  id: { txDigest: string };
  type: string;
  parsedJson: Record<string, unknown>;
};

async function queryModuleEvents(module: string): Promise<SuiEvent[]> {
  const res = await rpc<{ data?: SuiEvent[] }>("suix_queryEvents", [
    { MoveEventModule: { package: PUNDIT_PACKAGE, module } },
    null,
    50,
    true, // descending (most recent first)
  ]);
  return res?.data ?? [];
}

/** Prediction receipts (optionally filtered to one owner), with resolved verdicts merged in. */
export async function getReceipts(owner?: string): Promise<Receipt[]> {
  const events = await queryModuleEvents("receipt");
  const resolved = new Map<string, number>();
  const receipts: Receipt[] = [];

  for (const e of events) {
    if (e.type.endsWith("::receipt::PredictionResolved")) {
      const j = e.parsedJson;
      resolved.set(String(j.receipt_id), Number(j.verdict));
    }
  }
  for (const e of events) {
    if (!e.type.endsWith("::receipt::PredictionCommitted")) continue;
    const j = e.parsedJson;
    if (owner && String(j.owner) !== owner) continue;
    const receiptId = String(j.receipt_id);
    receipts.push({
      receiptId,
      owner: String(j.owner),
      matchId: bytesToString(j.match_id),
      blobId: bytesToString(j.blob_id),
      committedAtMs: Number(j.committed_at_ms),
      txDigest: e.id.txDigest,
      verdict: resolved.get(receiptId),
    });
  }
  return receipts;
}
