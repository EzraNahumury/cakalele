// Client → Bitter Pundit agent backend (src/server.mjs)
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8787";

export type RecalledMemory = { blob_id: string; text: string; distance: number };
export type AgentReply = {
  reply: string;
  profile: { stateName?: string; state: number; respect: number; correct: number; wrong: number };
  recalled: RecalledMemory[];
  rememberedBlobId: string | null;
};

export async function callAgent(body: {
  message: string;
  namespace?: string;
  profileId?: string | null;
  storePrediction?: boolean;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<AgentReply> {
  const r = await fetch(`${AGENT_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`agent ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export async function agentHealthy(): Promise<boolean> {
  try {
    const r = await fetch(`${AGENT_URL}/health`);
    return r.ok;
  } catch {
    return false;
  }
}
