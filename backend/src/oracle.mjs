import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { PUNDIT, SUI_RPC } from "./config.mjs";
import { remember } from "./memory.mjs";

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

/** record_result then resolve_prediction. Validates the receipt BEFORE recording (no orphan MatchResult on a doomed resolve). */
export async function settle(profileId, receiptId, matchId, verdict, resultText = "official result") {
  const { fields, type } = await getReceiptFields(receiptId);
  if (!fields || !String(type).includes("::receipt::PredictionReceipt")) throw new Error("bad receipt: " + receiptId);
  if (Number(fields.status) !== 0) throw new Error(`receipt ${receiptId} already resolved (status ${fields.status})`);
  if (fields.profile_id !== profileId) throw new Error(`profile mismatch: receipt.profile_id=${fields.profile_id} != ${profileId}`);
  const rec = await recordResult(matchId, resultText);
  if (!rec.matchResultId) throw new Error("record_result did not create a MatchResult");
  const resolved = await resolvePrediction(profileId, receiptId, rec.matchResultId, verdict, { validate: false });
  return { ...rec, ...resolved };
}
