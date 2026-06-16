import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { PUNDIT, SUI_RPC } from "./config.mjs";
import { remember, recallTextByBlob } from "./memory.mjs";
import { fetchResult, judgeVerdict } from "./matchOracle.mjs";

const decodeBytes = (v) => (Array.isArray(v) ? new TextDecoder().decode(Uint8Array.from(v)) : typeof v === "string" ? v : "");

const ORACLE_CAP = process.env.PUNDIT_ORACLE_CAP_ID || "0x39e9dbc5cfbbb4c12534d2da14423a65aff2c336fcc24cc4941724770928f8f0";
const CLOCK = "0x6";
const enc = (s) => Array.from(new TextEncoder().encode(s));

export const VERDICT = { CORRECT: 1, WRONG: 2 };

function signer() {
  if (!process.env.SUI_PRIVATE_KEY) throw new Error("SUI_PRIVATE_KEY missing (OracleCap holder)");
  const { secretKey } = decodeSuiPrivateKey(process.env.SUI_PRIVATE_KEY);
  return Ed25519Keypair.fromSecretKey(secretKey);
}
const client = () => new SuiJsonRpcClient({ url: SUI_RPC, network: "mainnet" });

// Defensive: tolerate both legacy ({digest,events,objectChanges}) and wrapped
// ({Transaction:{digest,events,effects.changedObjects}}) result shapes across @mysten/sui minors.
function unwrap(res) {
  const t = res?.Transaction ?? res?.FailedTransaction ?? res;
  const events = (res?.events ?? t?.events ?? []).map((e) => ({ type: e.type ?? e.eventType, json: e.parsedJson ?? e.json }));
  const created = [
    ...(res?.objectChanges ?? []).filter((o) => o.type === "created").map((o) => ({ id: o.objectId, type: o.objectType })),
    ...((t?.effects?.changedObjects ?? res?.effects?.changedObjects ?? [])
      .map((o) => ({ id: o.objectId ?? o.reference?.objectId ?? o.id, type: o.objectType ?? o.outputType }))
      .filter((o) => o.id && o.type)),
  ];
  return { digest: res?.digest ?? t?.digest, events, created };
}

export function buildRecordResultTx(matchId, resultBlobId) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PUNDIT.packageId}::oracle::record_result`,
    arguments: [tx.object(ORACLE_CAP), tx.pure.vector("u8", enc(matchId)), tx.pure.vector("u8", enc(resultBlobId)), tx.object(CLOCK)],
  });
  return tx;
}

export function buildResolveTx(profileId, receiptId, matchResultId, verdict) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PUNDIT.packageId}::oracle::resolve_prediction`,
    arguments: [tx.object(ORACLE_CAP), tx.object(profileId), tx.object(receiptId), tx.object(matchResultId), tx.pure.u8(verdict)],
  });
  return tx;
}

async function dryRun(tx) {
  const c = client();
  tx.setSenderIfNotSet(signer().toSuiAddress());
  const bytes = await tx.build({ client: c });
  const res = await c.dryRunTransactionBlock({ transactionBlock: bytes });
  const st = res?.effects?.status;
  const status = typeof st === "string" ? st : st?.status;
  return { ok: status === "success", status, error: st?.error };
}

/** Poll until an object id is visible to the fullnode (after a create tx). */
async function waitForObject(id, tries = 20, delayMs = 1000) {
  const c = client();
  for (let i = 0; i < tries; i++) {
    try {
      const o = await c.getObject({ id, options: { showType: true } });
      if (o?.data) return true;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function exec(tx) {
  const res = await client().signAndExecuteTransaction({
    signer: signer(),
    transaction: tx,
    options: { showObjectChanges: true, showEvents: true },
  });
  return unwrap(res);
}

/** Read a receipt's content fields + type (pre-flight validation). */
export async function getReceiptFields(receiptId) {
  const o = await client().getObject({ id: receiptId, options: { showContent: true, showType: true } });
  return { fields: o?.data?.content?.fields, type: o?.data?.content?.type ?? o?.data?.type ?? "" };
}

/** Record an official match result on-chain (OracleCap). Stores the result text on Walrus first. */
export async function recordResult(matchId, resultText, { storeOnWalrus = true } = {}) {
  let resultBlobId = resultText;
  if (storeOnWalrus) {
    try {
      resultBlobId = await remember(`[RESULT ${matchId}] ${resultText}`, { namespace: "pundit-results" });
    } catch {
      /* fall back to inline text */
    }
  }
  const u = await exec(buildRecordResultTx(matchId, resultBlobId));
  const mr = u.created.find((o) => /::oracle::MatchResult/.test(o.type || ""));
  return { digest: u.digest, matchResultId: mr?.id, resultBlobId };
}

/** Resolve a prediction (OracleCap). Validates the receipt + dry-runs before the irreversible write. */
export async function resolvePrediction(profileId, receiptId, matchResultId, verdict, { validate = true } = {}) {
  const v = verdict === "correct" || verdict === 1 ? VERDICT.CORRECT : VERDICT.WRONG;
  if (validate) {
    const { fields, type } = await getReceiptFields(receiptId);
    if (!fields) throw new Error("receipt not found: " + receiptId);
    if (!String(type).includes("::receipt::PredictionReceipt")) throw new Error("not a PredictionReceipt: " + type);
    if (Number(fields.status) !== 0) throw new Error(`receipt ${receiptId} already resolved (status ${fields.status})`);
    if (fields.profile_id !== profileId) throw new Error(`profile mismatch: receipt.profile_id=${fields.profile_id} != ${profileId}`);
  }
  const dry = await dryRun(buildResolveTx(profileId, receiptId, matchResultId, v));
  if (!dry.ok) throw new Error("resolve dry-run failed: " + JSON.stringify(dry.error ?? dry.status));
  const u = await exec(buildResolveTx(profileId, receiptId, matchResultId, v));
  const ev = u.events.find((e) => String(e.type).endsWith("::receipt::PredictionResolved"));
  return { digest: u.digest, resolved: ev?.json };
}

/** List PENDING receipts (optionally for one owner) via JSON-RPC. */
export async function listPendingReceipts(owner) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "suix_queryEvents",
    params: [{ MoveEventModule: { package: PUNDIT.packageId, module: "receipt" } }, null, 50, true],
  };
  const r = await fetch(SUI_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await r.json())?.result?.data ?? [];
  const resolved = new Set();
  for (const e of data) if (e.type.endsWith("::receipt::PredictionResolved")) resolved.add(String(e.parsedJson.receipt_id));
  const out = [];
  for (const e of data) {
    if (!e.type.endsWith("::receipt::PredictionCommitted")) continue;
    const j = e.parsedJson;
    const id = String(j.receipt_id);
    if (owner && String(j.owner) !== owner) continue;
    if (resolved.has(id)) continue;
    out.push({ receiptId: id, matchId: decodeBytes(j.match_id), blobId: decodeBytes(j.blob_id), owner: String(j.owner) });
  }
  return out;
}

/**
 * Resolve a receipt from REAL data: fetch the official result, recall the prediction text,
 * let the LLM judge correct/wrong, then settle. If the match has no real result yet,
 * the receipt is LEFT PENDING (honest — we never fabricate a verdict).
 */
export async function autoResolve(profileId, receiptId, ownerAddress) {
  const { fields, type } = await getReceiptFields(receiptId);
  if (!fields || !String(type).includes("::receipt::PredictionReceipt")) return { receiptId, status: "skip", reason: "bad receipt" };
  if (Number(fields.status) !== 0) return { receiptId, status: "skip", reason: "already resolved" };

  const matchId = decodeBytes(fields.match_id);
  const blobId = decodeBytes(fields.blob_id);

  const result = await fetchResult(matchId);
  if (!result) return { receiptId, matchId, status: "pending", reason: "no real result yet" };

  const prediction = (await recallTextByBlob(blobId, [ownerAddress, fields.owner, "pundit-smoke"], matchId)) || matchId;
  const verdict = await judgeVerdict(prediction, result);
  const settled = await settle(profileId, receiptId, matchId, verdict, `${result.home} ${result.homeScore}-${result.awayScore} ${result.away}`);
  return {
    receiptId,
    matchId,
    status: "resolved",
    verdict,
    realResult: `${result.homeScore}-${result.awayScore}`,
    prediction,
    digest: settled.digest,
  };
}

/**
 * Resolve EVERY pending receipt across ALL profiles from real data — no args needed.
 * Reads each receipt's profile_id + owner from chain, then autoResolve()s it.
 * Matches without a real result yet stay Pending (retried next run). Cron-friendly.
 */
export async function resolveAllPending() {
  const pending = await listPendingReceipts();
  const results = [];
  for (const r of pending) {
    try {
      const { fields } = await getReceiptFields(r.receiptId);
      const profileId = fields?.profile_id;
      const owner = fields?.owner;
      if (!profileId) {
        results.push({ receiptId: r.receiptId, matchId: r.matchId, status: "skip", reason: "no profile_id" });
        continue;
      }
      results.push(await autoResolve(profileId, r.receiptId, owner));
    } catch (e) {
      results.push({ receiptId: r.receiptId, matchId: r.matchId, status: "error", reason: String(e?.message || e).slice(0, 120) });
    }
  }
  return results;
}

/** record_result then resolve_prediction. Validates the receipt BEFORE recording (no orphan MatchResult on a doomed resolve). */
export async function settle(profileId, receiptId, matchId, verdict, resultText = "official result") {
  const { fields, type } = await getReceiptFields(receiptId);
  if (!fields || !String(type).includes("::receipt::PredictionReceipt")) throw new Error("bad receipt: " + receiptId);
  if (Number(fields.status) !== 0) throw new Error(`receipt ${receiptId} already resolved (status ${fields.status})`);
  if (fields.profile_id !== profileId) throw new Error(`profile mismatch: receipt.profile_id=${fields.profile_id} != ${profileId}`);
  const rec = await recordResult(matchId, resultText);
  if (!rec.matchResultId) throw new Error("record_result did not create a MatchResult");
  // wait until the new MatchResult is visible to the fullnode before resolving (read-after-write lag)
  await waitForObject(rec.matchResultId);
  const resolved = await resolvePrediction(profileId, receiptId, rec.matchResultId, verdict, { validate: false });
  return { ...rec, ...resolved };
}
