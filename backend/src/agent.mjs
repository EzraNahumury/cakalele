import { chat } from "./llm.mjs";
import { recall, remember } from "./memory.mjs";
import { getProfile, getReceipts } from "./onchain.mjs";
import { buildSystemPrompt } from "./persona.mjs";

const DEFAULT_PROFILE = { state: 0, respect: 50, correct: 0, wrong: 0, stateName: "Skeptis" };

/**
 * One orchestrated agent turn:
 *   1. recall() relevant memories from Walrus for this namespace
 *   2. read PunditProfile (respect/state) from Sui mainnet (if profileId given)
 *   3. build persona system prompt from state + memories
 *   4. LLM reply (Ollama)
 *   5. optionally remember() the user message as a new prediction
 *
 * @returns {{reply, profile, recalled, rememberedBlobId}}
 */
export async function respond({ userMessage, namespace, profileId, storePrediction = false, history = [] }) {
  if (!userMessage) throw new Error("userMessage required");

  const memories = await recall(userMessage, { namespace }).catch(() => []);

  let profile = { ...DEFAULT_PROFILE };
  if (profileId) {
    try { profile = await getProfile(profileId); } catch { /* keep default on read failure */ }
  }

  // Annotate recalled memories with their on-chain verdict (join by blob_id) so the
  // agent knows which predictions already RESOLVED Correct/Wrong vs still pending.
  let annotated = memories;
  try {
    if (profile.owner) {
      const byBlob = new Map((await getReceipts(profile.owner)).map((r) => [r.blobId, r]));
      annotated = memories.map((m) => {
        const r = byBlob.get(m.blob_id);
        return r ? { ...m, verdict: r.verdict, matchId: r.matchId } : m;
      });
    }
  } catch { /* annotation is best-effort */ }

  const system = buildSystemPrompt({ ...profile, memories: annotated });
  const messages = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: userMessage },
  ];
  const reply = await chat(messages);

  let rememberedBlobId = null;
  if (storePrediction) {
    try { rememberedBlobId = await remember(userMessage, { namespace }); } catch { /* non-fatal */ }
  }

  return { reply, profile, recalled: annotated, rememberedBlobId };
}
