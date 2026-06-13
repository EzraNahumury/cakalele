"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { callAgent, agentHealthy, type RecalledMemory } from "../lib/agent";
import {
  buildCommitPredictionTx,
  buildCreateProfileTx,
  getProfile,
  getProfileIdForOwner,
  getReceipts,
  suiscan,
  waitForProfileId,
  type Profile,
  type Receipt,
} from "../lib/onchain";

type ChatMsg = {
  role: "user" | "agent";
  text: string;
  recalled?: RecalledMemory[];
  blob?: string | null;
  note?: string;
};

const STATE_TONE: Record<string, string> = {
  Skeptis: "bg-surface-container-high text-on-surface",
  Rival: "bg-error text-white",
  Naik: "bg-secondary-container text-on-secondary-container",
  Respek: "bg-tertiary text-white",
  Oracle: "bg-primary text-white",
};

export default function PlayPage() {
  const account = useCurrentAccount();
  const address = account?.address ?? null;
  const { mutateAsync: signTx } = useSignAndExecuteTransaction();

  const [agentUp, setAgentUp] = useState<boolean | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [storePred, setStorePred] = useState(false);
  const [matchId, setMatchId] = useState("");
  const [confidence, setConfidence] = useState(1);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    agentHealthy().then(setAgentUp);
  }, []);

  const loadChain = useCallback(async (addr: string) => {
    try {
      const pid = await getProfileIdForOwner(addr);
      setProfileId(pid);
      setProfile(pid ? await getProfile(pid) : null);
      setReceipts(await getReceipts(addr));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (address) loadChain(address);
    else {
      setProfile(null);
      setProfileId(null);
      setReceipts([]);
      setMsgs([]);
    }
  }, [address, loadChain]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    const message = input.trim();
    if (!message || sending || !address) return;
    setErr(null);
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setSending(true);
    try {
      const history = msgs.slice(-6).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })) as {
        role: "user" | "assistant";
        content: string;
      }[];
      const out = await callAgent({ message, namespace: address, profileId, storePrediction: storePred, history });

      // ── Receipt loop: anchor the stored prediction on-chain (user signs) ──
      const notes: string[] = [];
      if (storePred && out.rememberedBlobId) {
        try {
          let pid = profileId;
          if (!pid) {
            setStatus("Buat profil on-chain — tanda tangan di wallet…");
            const r1 = await signTx({ transaction: buildCreateProfileTx() });
            notes.push(`profil dibuat (tx ${r1.digest.slice(0, 8)}…)`);
            pid = await waitForProfileId(address);
            setProfileId(pid);
          }
          if (pid) {
            setStatus("Anchor receipt on-chain — tanda tangan di wallet…");
            const mid = matchId.trim() || `PRED-${new Date().toISOString().slice(0, 10)}`;
            const r2 = await signTx({ transaction: buildCommitPredictionTx(pid, mid, out.rememberedBlobId, confidence) });
            notes.push(`receipt on-chain (tx ${r2.digest.slice(0, 8)}…)`);
            await loadChain(address);
          } else {
            notes.push("⚠️ profil belum terbaca on-chain, coba lagi sebentar");
          }
        } catch (e) {
          notes.push("⚠️ commit on-chain batal/gagal: " + String((e as Error).message || e).slice(0, 120));
        } finally {
          setStatus(null);
        }
      }

      setMsgs((m) => [
        ...m,
        { role: "agent", text: out.reply, recalled: out.recalled, blob: out.rememberedBlobId, note: notes.join(" · ") || undefined },
      ]);
      if (out.rememberedBlobId && !storePred) loadChain(address);
    } catch (e) {
      setErr(String((e as Error).message || e));
      setMsgs((m) => [...m, { role: "agent", text: "⚠️ Agen tak bisa dihubungi. Pastikan backend jalan (`npm run serve`)." }]);
    } finally {
      setSending(false);
      setStatus(null);
    }
  };

  if (!address) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 py-16">
        <h1 className="text-3xl font-black text-on-surface">Masuk dulu, ahli taktik.</h1>
        <p className="text-on-surface-variant">
          Sambungkan wallet Sui — itu jadi identitas & namespace memori on-chain kamu. Tanpa wallet, The Bitter Pundit
          tak punya siapa-siapa untuk ditagih.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
        <Link href="/" className="inline-block text-sm text-secondary hover:underline">
          ← kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
      {/* ── CHAT ── */}
      <section className="sticker-card rounded-2xl p-5 flex flex-col h-[70vh] min-h-[480px]">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-on-surface">🎙️ The Bitter Pundit</span>
            <span
              className={`pill ${agentUp === false ? "bg-error text-white" : "bg-tertiary text-white"}`}
              title="status agen"
            >
              {agentUp === null ? "…" : agentUp ? "online" : "offline"}
            </span>
          </div>
          <ConnectButton />
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {msgs.length === 0 && (
            <p className="text-sm text-on-surface-variant">
              Lempar prediksimu. Centang <strong>simpan prediksi</strong> agar di-anchor ke Walrus dan bisa ditagih nanti.
            </p>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`${m.role === "user" ? "bubble-user" : "bubble-agent"} max-w-[85%] px-4 py-2.5 text-sm leading-relaxed`}>
                {m.text}
                {m.recalled && m.recalled.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/30 text-[11px] opacity-90 space-y-1">
                    <p className="font-bold">↳ memori ter-recall (Walrus):</p>
                    {m.recalled.map((r, j) => (
                      <p key={j} className="truncate">
                        d={r.distance?.toFixed?.(2)} · {r.text}
                      </p>
                    ))}
                  </div>
                )}
                {m.blob && <p className="mt-1 text-[11px] opacity-90">📝 disimpan → blob {m.blob.slice(0, 16)}…</p>}
                {m.note && <p className="mt-1 text-[11px] opacity-90">⛓️ {m.note}</p>}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {status && <p className="text-xs text-primary pb-1">⏳ {status}</p>}
        {err && <p className="text-xs text-error pb-1">{err}</p>}
        <div className="pt-3 border-t border-outline-variant space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-on-surface-variant whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={storePred} onChange={(e) => setStorePred(e.target.checked)} />
              simpan prediksi (anchor on-chain)
            </label>
            {storePred && (
              <>
                <input
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  placeholder="match id (mis. ARG-FRA-2026-06-13)"
                  className="flex-1 min-w-[140px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
                <select
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-xs outline-none focus:border-primary"
                >
                  <option value={0}>low</option>
                  <option value={1}>med</option>
                  <option value={2}>high</option>
                </select>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Argentina juara, Messi top skor…"
              className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={send}
              disabled={sending}
              className="bg-primary text-white rounded-xl px-5 py-2.5 font-bold text-sm disabled:opacity-50 hover:bg-[#003a9e] transition-colors"
            >
              {sending ? "…" : "Kirim"}
            </button>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD ── */}
      <section className="space-y-4">
        <div className="sticker-card rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-black text-on-surface">Respect Score</h2>
          {profile ? (
            <>
              <div className="flex items-center justify-between">
                <span className={`pill ${STATE_TONE[profile.stateName] ?? "bg-surface-container-high"}`}>{profile.stateName}</span>
                <span className="text-2xl font-black text-primary">{profile.respect}/100</span>
              </div>
              <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${profile.respect}%` }} />
              </div>
              <p className="text-xs text-on-surface-variant">
                benar {profile.correct} · salah {profile.wrong} · total {profile.total}
                {profileId && (
                  <>
                    {" · "}
                    <a className="text-secondary hover:underline" href={suiscan("object", profileId)} target="_blank" rel="noreferrer">
                      profil on-chain ↗
                    </a>
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Belum ada profil on-chain untuk wallet ini. Profil dibuat saat commit prediksi pertama (atau via
              <code className="px-1">create_profile</code>).
            </p>
          )}
        </div>

        <div className="sticker-card rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-black text-on-surface">Receipt (on-chain)</h2>
          {receipts.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Belum ada receipt prediksi untuk wallet ini.</p>
          ) : (
            <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
              {receipts.map((r) => (
                <li key={r.receiptId} className="rounded-xl border border-outline-variant p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-on-surface truncate">{r.matchId || "(match)"}</span>
                    <span
                      className={`pill ${r.verdict === 1 ? "bg-tertiary text-white" : r.verdict === 2 ? "bg-error text-white" : "bg-surface-container-high"}`}
                    >
                      {r.verdict === 1 ? "Benar" : r.verdict === 2 ? "Salah" : "Pending"}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {r.committedAtMs ? new Date(r.committedAtMs).toLocaleString("id-ID") : ""}
                  </p>
                  <div className="flex gap-3 text-xs mt-1">
                    <a className="text-secondary hover:underline" href={suiscan("object", r.receiptId)} target="_blank" rel="noreferrer">
                      receipt ↗
                    </a>
                    <a className="text-secondary hover:underline" href={suiscan("tx", r.txDigest)} target="_blank" rel="noreferrer">
                      tx ↗
                    </a>
                    <span className="text-on-surface-variant truncate" title={r.blobId}>
                      blob {r.blobId.slice(0, 12)}…
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
