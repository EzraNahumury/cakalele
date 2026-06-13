/**
 * Seed the Respect Arc on mainnet + capture a genuine before/after.
 *
 *   BEFORE  → agent persona at respect 50 / Skeptis (current profile state)
 *   commit a 2nd receipt, then settle BOTH receipts CORRECT (record_result + resolve)
 *   AFTER   → agent persona at respect 100 / Oracle (insecure/begging)
 *
 * Irreversible mainnet writes signed by the OracleCap / profile-owner wallet (signalvault).
 * Run once. Existing receipt #1 (ARG-FRA-2026-06-13) was seeded earlier.
 */
import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { PUNDIT, SUI_RPC, MEMWAL } from "../src/config.mjs";
import { remember } from "../src/memory.mjs";
import { settle } from "../src/oracle.mjs";
import { respond } from "../src/agent.mjs";
import { getProfile } from "../src/onchain.mjs";

const PROFILE = "0x418b67920002bbbd727146b02a32b55fdfd1624d519d757220e59c59af5529d9";
const RECEIPT1 = "0xf9633fed15b964142d37c315bb9c4b34fc2c735eab54506e5747fa183aeb1009";
const MATCH1 = "ARG-FRA-2026-06-13";
const MATCH2 = "POR-ESP-2026-06-20";
const NS = MEMWAL.namespace; // pundit-smoke

const kp = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(process.env.SUI_PRIVATE_KEY).secretKey);
const client = new SuiJsonRpcClient({ url: SUI_RPC, network: "mainnet" });
const enc = (s) => Array.from(new TextEncoder().encode(s));
const rule = (t) => console.log("\n" + "═".repeat(66) + (t ? "\n" + t : ""));

async function commit(profileId, matchId, blobId, confidence) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PUNDIT.packageId}::receipt::commit_prediction`,
    arguments: [tx.object(profileId), tx.pure.vector("u8", enc(matchId)), tx.pure.vector("u8", enc(blobId)), tx.pure.u8(confidence), tx.object("0x6")],
  });
  const res = await client.signAndExecuteTransaction({ signer: kp, transaction: tx, options: { showObjectChanges: true } });
  const oc = res?.objectChanges ?? res?.Transaction?.effects?.changedObjects ?? [];
  const r = oc.find((o) => /::receipt::PredictionReceipt/.test(o.objectType || o.outputType || ""));
  return r?.objectId;
}

const PROMPT = "Halo pundit, gua balik lagi. Gimana penilaian lo soal track record prediksi gua sejauh ini?";

// ── BEFORE ──
rule("BEFORE — state on-chain saat ini");
{
  const p = await getProfile(PROFILE).catch(() => null);
  console.log(`profile: respect=${p?.respect} state=${p?.stateName} (benar ${p?.correct} / salah ${p?.wrong})`);
  const out = await respond({ userMessage: PROMPT, namespace: NS, profileId: PROFILE });
  console.log("🎙️  PUNDIT:", out.reply);
}

// ── MUTATE: commit receipt #2, settle both CORRECT ──
rule("RESOLVE — commit receipt #2 + settle dua-duanya CORRECT (mainnet)");
const blob2 = await remember("[PRED] Portugal kalahkan Spanyol 2-1, Ronaldo assist.", { namespace: NS });
console.log("receipt #2 blob:", blob2);
const RECEIPT2 = await commit(PROFILE, MATCH2, blob2, 2);
console.log("receipt #2 id:", RECEIPT2);

const s1 = await settle(PROFILE, RECEIPT1, MATCH1, "correct", "Argentina 3-0 Prancis, Messi hattrick.");
console.log("settle #1:", JSON.stringify(s1.resolved));
const s2 = await settle(PROFILE, RECEIPT2, MATCH2, "correct", "Portugal 2-1 Spanyol, Ronaldo assist.");
console.log("settle #2:", JSON.stringify(s2.resolved));

// ── AFTER ──
rule("AFTER — state on-chain setelah resolve");
{
  const p = await getProfile(PROFILE).catch(() => null);
  console.log(`profile: respect=${p?.respect} state=${p?.stateName} (benar ${p?.correct} / salah ${p?.wrong})`);
  const out = await respond({ userMessage: PROMPT, namespace: NS, profileId: PROFILE });
  console.log("🎙️  PUNDIT:", out.reply);
}
rule("");
