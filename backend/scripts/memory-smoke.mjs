/**
 * MemWal thin slice — go/no-go for Walrus Memory on MAINNET.
 *
 * Does a full round-trip with the REAL SDK (@mysten-incubation/memwal):
 *   1. (first run) generate delegate key → createAccount → addDelegateKey  [on-chain, Sui mainnet]
 *   2. remember(prediction) → waitForRememberJob → blob_id                [Walrus mainnet, spends WAL]
 *   3. recall(query) → semantic hit with the same blob_id                 [proves persistence]
 *
 * Prereq: backend/.env with SUI_PRIVATE_KEY (Sessions wallet, funded WAL+SUI).
 * Reuse: after first run, copy printed MEMWAL_ACCOUNT_ID + MEMWAL_DELEGATE_KEY into .env
 * (the MemWal contract allows ONE account per wallet, so don't re-create).
 */
import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";
import { createAccount, addDelegateKey, generateDelegateKey } from "@mysten-incubation/memwal/account";
// @mysten/sui v2.6+ removed internal client creation in MemWal's account ops, and v2.17
// renamed the JSON-RPC client to SuiJsonRpcClient — construct + inject it explicitly.
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

// MemWal Sui mainnet deployment (docs/contract/overview.md)
const DEFAULT_PACKAGE = "0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6";
const DEFAULT_REGISTRY = "0x0da982cefa26864ae834a8a0504b904233d49e20fcc17c373c8bed99c75a7edd";
const DEFAULT_RELAYER = "https://relayer.memory.walrus.xyz";

const packageId = process.env.MEMWAL_PACKAGE_ID || DEFAULT_PACKAGE;
const registryId = process.env.MEMWAL_REGISTRY_ID || DEFAULT_REGISTRY;
const serverUrl = process.env.MEMWAL_SERVER_URL || DEFAULT_RELAYER;
const namespace = process.env.MEMWAL_NAMESPACE || "pundit-smoke";
const suiPrivateKey = process.env.SUI_PRIVATE_KEY;

let accountId = process.env.MEMWAL_ACCOUNT_ID;
let delegateKey = process.env.MEMWAL_DELEGATE_KEY;

const fail = (msg) => { console.error("✗", msg); process.exit(1); };

console.log("MemWal thin slice → mainnet");
console.log("  package :", packageId);
console.log("  registry:", registryId);
console.log("  relayer :", serverUrl);
console.log("  namespace:", namespace);

if (!accountId || !delegateKey) {
  if (!suiPrivateKey) fail("Missing SUI_PRIVATE_KEY in backend/.env (Sessions wallet). Cannot create account.");
  console.log("\n[1] No MEMWAL_ACCOUNT_ID/DELEGATE_KEY in .env — provisioning on-chain (Sui mainnet)…");
  const suiClient = new SuiJsonRpcClient({ url: "https://fullnode.mainnet.sui.io:443" });
  const delegate = await generateDelegateKey();
  delegateKey = delegate.privateKey;
  try {
    const acc = await createAccount({ packageId, registryId, suiPrivateKey, suiClient, suiNetwork: "mainnet" });
    accountId = acc.accountId;
    console.log("    createAccount  tx=", acc.digest, " accountId=", accountId);
  } catch (e) {
    fail(`createAccount failed: ${e?.message || e}\n    If this wallet already has a MemWal account, put its id in MEMWAL_ACCOUNT_ID (+ the saved MEMWAL_DELEGATE_KEY) and rerun.`);
  }
  const add = await addDelegateKey({ packageId, accountId, publicKey: delegate.publicKey, label: "pundit-backend", suiPrivateKey, suiClient, suiNetwork: "mainnet" });
  console.log("    addDelegateKey tx=", add.digest, " delegateSuiAddr=", add.suiAddress);
  console.log("\n    >>> SAVE to backend/.env (reuse next runs — 1 account per wallet):");
  console.log("    MEMWAL_ACCOUNT_ID=" + accountId);
  console.log("    MEMWAL_DELEGATE_KEY=" + delegateKey);
}

const mem = MemWal.create({ key: delegateKey, accountId, serverUrl, namespace });

// ── COMMIT (remember) ──
const claim = `[SMOKE ${new Date().toISOString()}] Prediksi: Argentina menang 3-0 lawan Prancis, Messi hattrick.`;
console.log("\n[2] remember():", claim);
const job = await mem.remember(claim);
console.log("    job:", JSON.stringify(job));
const done = await mem.waitForRememberJob(job.job_id);
console.log("    committed → blob_id=", done.blob_id, " owner=", done.owner, " ns=", done.namespace);

// ── RECALL ──
const query = "Apa prediksi user tentang Argentina dan Messi?";
console.log("\n[3] recall():", query);
const res = await mem.recall({ query, topK: 5 });
console.log("    total hits:", res.total);
for (const m of res.results) {
  console.log(`    [d=${m.distance?.toFixed?.(4) ?? m.distance}] ${m.text}  (blob ${m.blob_id})`);
}

const recalled = res.results?.some((m) => m.blob_id === done.blob_id);
console.log("\n" + (recalled ? "✅ GO" : "⚠️  PARTIAL") + " — MemWal round-trip on mainnet complete.");
console.log("   blob_id =", done.blob_id);
console.log("   recall matched committed blob:", recalled);
if (!recalled) console.log("   (commit succeeded; recall may need a moment for index — rerun recall.)");
