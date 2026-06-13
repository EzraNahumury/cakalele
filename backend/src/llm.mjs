import { OLLAMA } from "./config.mjs";

/**
 * Chat via Ollama Cloud (native /api/chat). Returns assistant content (string).
 * gpt-oss-style "thinking" is kept out of `content` by the server, so we read content only.
 */
export async function chat(messages, { temperature = 0.85, model } = {}) {
  if (!OLLAMA.key) throw new Error("OLLAMA_KEY missing in backend/.env");
  const res = await fetch(OLLAMA.host + "/api/chat", {
    method: "POST",
    headers: { Authorization: "Bearer " + OLLAMA.key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: model || OLLAMA.model, messages, stream: false, options: { temperature } }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${body.slice(0, 240)}`);
  }
  const j = await res.json();
  return (j.message?.content || "").trim();
}
