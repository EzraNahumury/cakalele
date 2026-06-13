/**
 * Orchestrator demo — proves the full loop on real infra:
 *   Walrus recall  +  on-chain PunditProfile (Sui mainnet)  +  Ollama persona reply.
 *
 * Read-only by default (no WAL spend). Set DEMO_STORE=1 to also remember() turn 2.
 * Uses the profile + namespace created by the MemWal thin slice as the demo user.
 */
import { respond } from "../src/agent.mjs";
import { MEMWAL } from "../src/config.mjs";

const PROFILE = process.env.DEMO_PROFILE_ID || "0x418b67920002bbbd727146b02a32b55fdfd1624d519d757220e59c59af5529d9";
const ns = process.env.DEMO_NAMESPACE || MEMWAL.namespace;
const store = process.env.DEMO_STORE === "1";

const rule = (t) => console.log("\n" + "─".repeat(64) + (t ? "\n" + t : ""));

rule(`SESSION  namespace=${ns}  profile=${PROFILE.slice(0, 14)}…  store=${store}`);

const turns = [
  { msg: "Halo, gua balik lagi. Inget gak prediksi gua soal Argentina sama Messi?", store: false },
  { msg: "Prediksi baru gua: Brasil juara Piala Dunia 2026, Vinicius top skor.", store },
];

for (const t of turns) {
  console.log("\n👤 USER:", t.msg);
  const out = await respond({ userMessage: t.msg, namespace: ns, profileId: PROFILE, storePrediction: t.store });
  const p = out.profile;
  console.log(
    `🧠 [state=${p.stateName ?? p.state} respect=${p.respect} benar=${p.correct} salah=${p.wrong} | recalled=${out.recalled.length}` +
    (out.rememberedBlobId ? ` | stored=${out.rememberedBlobId.slice(0, 12)}…` : "") + "]",
  );
  if (out.recalled.length) {
    for (const m of out.recalled) console.log(`   ↳ recall d=${m.distance?.toFixed?.(3) ?? m.distance}: ${(m.text || "").slice(0, 70)}`);
  }
  console.log("🎙️  PUNDIT:", out.reply);
}
rule("");
