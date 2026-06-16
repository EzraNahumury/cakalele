import { MemWal } from "@mysten-incubation/memwal";
import { MEMWAL } from "./config.mjs";

/** Build a MemWal client for a namespace using the configured delegate key. */
export function getMemory(namespace = MEMWAL.namespace) {
  if (!MEMWAL.accountId || !MEMWAL.delegateKey) {
    throw new Error("MEMWAL_ACCOUNT_ID / MEMWAL_DELEGATE_KEY missing in backend/.env (run `npm run test:memory` first).");
  }
  return MemWal.create({
    key: MEMWAL.delegateKey,
    accountId: MEMWAL.accountId,
    serverUrl: MEMWAL.serverUrl,
    namespace,
  });
}

/** Semantic recall. Returns [{ blob_id, text, distance }]. */
export async function recall(query, { namespace, topK = 5 } = {}) {
  const mem = getMemory(namespace);
  const res = await mem.recall({ query, topK });
  return res.results || [];
}

/** Store a memory on Walrus. Returns blob_id once the job completes. */
export async function remember(text, { namespace } = {}) {
  const mem = getMemory(namespace);
  const job = await mem.remember(text);
  const done = await mem.waitForRememberJob(job.job_id);
  return done.blob_id;
}

/** Recover a prediction's text from Walrus by its blob_id, searching candidate namespaces. */
export async function recallTextByBlob(blobId, namespaces = [], hint = "") {
  for (const ns of namespaces) {
    if (!ns) continue;
    try {
      const res = await recall(hint || "prediction", { namespace: ns, topK: 30 });
      const hit = (res || []).find((m) => m.blob_id === blobId);
      if (hit) return hit.text;
    } catch {
      /* try next namespace */
    }
  }
  return null;
}
