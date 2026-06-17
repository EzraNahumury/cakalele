import { OLLAMA } from "./config.mjs";

// Cloud models get retired / gated over time. If the configured model is gone
// (410 retired / 404 / subscription-gated), transparently fall back to a live one.
const FALLBACKS = ["gpt-oss:120b", "glm-4.7", "gemma3:12b"];
const isModelGone = (status, body) =>
  status === 404 || status === 410 || /retired|not found|requires a subscription/i.test(body);

/**
 * Chat via Ollama Cloud (native /api/chat). Returns assistant content (string).
 * Tries the configured model, then fallbacks if it has been retired/gated.
 */
export async function chat(messages, { temperature = 0.85, model } = {}) {
  if (!OLLAMA.key) throw new Error("OLLAMA_KEY missing in backend/.env");
  const primary = model || OLLAMA.model;
  const order = [primary, ...FALLBACKS.filter((m) => m !== primary)];

  let lastErr = "";
  for (const m of order) {
    const res = await fetch(OLLAMA.host + "/api/chat", {
      method: "POST",
      headers: { Authorization: "Bearer " + OLLAMA.key, "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, messages, stream: false, options: { temperature } }),
    });
    if (res.ok) {
      const j = await res.json();
      return (j.message?.content || "").trim();
    }
    const body = await res.text().catch(() => "");
    lastErr = `Ollama ${res.status} (${m}): ${body.slice(0, 200)}`;
    // only fall through to the next model if THIS one is unavailable; otherwise fail fast
    if (!isModelGone(res.status, body)) throw new Error(lastErr);
  }
  throw new Error(`No available Ollama model. Last: ${lastErr}`);
}
