<div align="center">

<img src="frontend/public/logo1.png" alt="CAKALELE — The Bitter Pundit" width="150" />

# 🧠⚽ The Bitter Pundit — *The Receipt*

### An arrogant AI football pundit that **saves every prediction you make as on-chain proof you can't delete** — and whose relationship with you evolves from dismissive → respect → dependent, based on your *proven* track record.

<br/>

[![Walrus Sessions 4](https://img.shields.io/badge/Walrus%20Sessions-Memory%20World%20Cup-0AB7C4)](https://thewalrussessions.wal.app)
[![Network](https://img.shields.io/badge/Network-Walrus%20Mainnet-blue)](https://walrus.xyz)
[![Memory](https://img.shields.io/badge/Memory-MemWal%20(Walrus%20Memory)-7B61FF)](https://docs.wal.app/walrus-memory/getting-started/what-is-walrus-memory)
[![Chain](https://img.shields.io/badge/Chain-Sui-6FBCF0)](https://sui.io)
[![Status](https://img.shields.io/badge/Status-LIVE%20on%20Mainnet-2ea44f)](https://cakalele.vercel.app)
[![Live App](https://img.shields.io/badge/Live%20App-cakalele.vercel.app-000000)](https://cakalele.vercel.app)

</div>

---

## 🔗 Live

| | |
|---|---|
| 🎮 **App (live)** | https://cakalele.vercel.app |
| 🤖 **Agent API** | https://cakalele-production-b226.up.railway.app/health |
| 📜 **Contract (Suiscan)** | [`pundit` package](https://suiscan.xyz/mainnet/object/0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f) |
| 💾 **Repo** | https://github.com/EzraNahumury/cakalele |

---

> **TL;DR** — The Bitter Pundit is an AI agent with the personality of an arrogant football pundit. What sets it apart from a regular "roast bot": **every prediction you make is committed to Walrus with a timestamp BEFORE kickoff**, so the agent holds **on-chain proof** you can't deny or edit. Its memory is **episodic** (it quotes your own words, not just scores), and **your relationship has an arc**: an agent that starts out dismissive can grow to respect you — even become insecure and beg for tips — once your predictions prove sharp. Beating its arrogance is the *game*. Walrus isn't a bolt-on; it's the **permanent ledger that makes the whole concept possible.**

---

## 1. The idea

Most "AI football" demos are stateless roast bots. The Bitter Pundit is built around one mechanic: **the receipt.**

- You make a prediction → the text is stored on **Walrus** (permanent, content-addressed) and **anchored on Sui** as a `PredictionReceipt` with a **trustless `Clock` timestamp**, signed by *your* wallet. It can't be backdated or edited.
- After the match, an **oracle** records the real result and resolves your receipt **Correct/Wrong** — which updates your on-chain **Respect Score**.
- The agent's **persona changes with that score**: Skeptic → Rival → Rising → Respect → Oracle. The agent quotes your old predictions back at you ("you said Argentina 3-0…") — something it could not do on day one.

The "before vs after" — the agent on day one vs after several resolved predictions — is real, on-chain, and verifiable.

---

## 2. Architecture

```
                          ┌──────────────────────────────────────────────┐
   User wallet  ──commit──►│  Sui Mainnet — pundit package                │
   (signs)               │   profile · receipt · oracle  (Move)          │
                          └──────────────────────────────────────────────┘
        │                         ▲ record_result / resolve_prediction
        │ remember()              │ (OracleCap)
        ▼                         │
   ┌─────────────┐        ┌───────────────┐      ┌──────────────────┐
   │ Walrus      │◄───────│ Backend agent │◄─────│ Match Oracle      │
   │ Memory      │ recall │ (Railway)     │ real │ (TheSportsDB)     │
   │ (MemWal)    │───────►│ persona+LLM   │ score└──────────────────┘
   └─────────────┘        │ (Ollama)      │
                          └───────────────┘
                                  ▲ POST /chat
                          ┌───────────────┐
                          │ Frontend app  │  wallet connect · chat ·
                          │ (Next.js/Vercel)  Receipt & Respect dashboard
                          └───────────────┘
```

| Layer | What | Where |
|---|---|---|
| **Smart contract** | `pundit` Move package: `profile` (Respect Score + registry), `receipt` (anchor blob_id + Clock timestamp), `oracle` (OracleCap-gated resolve) | Sui mainnet |
| **Walrus Memory** | episodic memory: `remember()` / `recall()` via MemWal SDK | Walrus mainnet |
| **Backend agent** | orchestrator: recall → persona prompt (from on-chain respect) → LLM → remember; oracle resolve | Railway (`backend/`) |
| **Match oracle** | fetches **real** match results, LLM judges prediction vs result | TheSportsDB (`backend/src/matchOracle.mjs`) |
| **Frontend** | wallet connect, chat, Receipt & Respect dashboard (reads on-chain events) | Vercel (`frontend/`) |

---

## 3. How it works (the loop)

1. **Connect wallet** → it becomes your identity and Walrus memory namespace.
2. **Predict** in chat. Tick *save prediction* →
   - backend `remember()`s the text to Walrus → returns a `blob_id`;
   - your wallet signs `commit_prediction(profile, match_id, blob_id, confidence, clock)` → a `PredictionReceipt` (status **Pending**) is created on Sui. First time, it also signs `create_profile`.
3. **The agent replies in character**, quoting any relevant recalled memory and reflecting your current Respect Score.
4. **After the match**, the oracle (`OracleCap` holder) records the real result and resolves the receipt **Correct/Wrong** → your Respect Score & relationship state recompute.
5. The dashboard shows your receipts (with Suiscan + Walrus links) and the Respect arc.

### Respect arc (on-chain, derived from accuracy)

`< 2 resolved → Skeptic` · `respect < 35 → Rival` · `< 55 → Rising` · `< 80 → Respect` · `≥ 80 → Oracle`

(`respect = correct / resolved × 100`.)

---

## 4. Match Result Oracle & Resolve flow

Verdicts come from a **real match-results oracle — never hand-typed scores.**

- `backend/src/matchOracle.mjs`: the LLM extracts the two teams from the match label, fetches the **finished** result from **TheSportsDB** (free; swap via `MATCH_ORACLE_BASE`), and the LLM judges your prediction (recalled from Walrus) against the real result.
- A receipt with **no real result yet** is **left Pending** (honest — retried on the next run).

**Manual resolve (any time):**
```bash
cd backend
npm run oracle -- resolve-all       # scan ALL pending receipts, resolve those with a real result
# or for one owner:
npm run oracle -- auto-all <profileId> <ownerAddress>
# or fully manual (you supply the verdict + result):
npm run oracle -- settle <profileId> <receiptId> <matchId> <correct|wrong> "<official result>"
```

**Automatic (Railway Cron):** a second service running `npm run oracle -- resolve-all` on a schedule (e.g. `0 */6 * * *`). See [DEPLOY.md](./DEPLOY.md) §4.

> **Web update:** resolving writes the verdict on-chain immediately. The web dashboard reads on-chain state on **page load / wallet connect**, so the new status appears after a **refresh** (there is a few-seconds RPC read-after-write lag). It is not a live push.

---

## 5. On-chain deployment (Sui Mainnet)

Full record: [smart-contract/deployments.mainnet.md](./smart-contract/deployments.mainnet.md).

```
Package         0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f
ProfileRegistry 0xc4f4dd4183f14ca23c8a795a39f84cc5177d45f3536e6b9acc586a3d1db6cf73  (Shared)
OracleCap       0x39e9dbc5cfbbb4c12534d2da14423a65aff2c336fcc24cc4941724770928f8f0  (backend)
OracleAdminCap  0xdc0e103eca282e1fb68f6e123f4c822ae5d062f7085d88d6c0737499c805e052  (recovery)
```

Events the dashboard indexes: `ProfileCreated`, `PredictionCommitted`, `PredictionResolved`, `ResultRecorded`.

Build + test the contract: `cd smart-contract && sui move build && sui move test` (8/8 pass).

---

## 6. Tech stack

- **Smart contract:** Move on Sui (edition 2024), `pundit` package — published to mainnet.
- **Memory:** [Walrus Memory / MemWal](https://github.com/MystenLabs/MemWal) SDK on Walrus mainnet (relayer `relayer.memory.walrus.xyz`, account `0x542985…ffc24`).
- **Backend:** Node.js (ESM), `http` server — `POST /chat`, `GET /health`; oracle CLI.
- **LLM:** Ollama Cloud (default `qwen3-vl:235b-instruct`).
- **Match data:** TheSportsDB (swappable).
- **Frontend:** Next.js (App Router) + Tailwind v4 + `@mysten/dapp-kit` + `@mysten/sui` v2.

---

## 7. Setup & Run

Monorepo: `frontend/` · `backend/` · `smart-contract/`. **Live:** app on Vercel, agent on Railway, contract on Sui mainnet. Deploy steps: [DEPLOY.md](./DEPLOY.md).

### Backend (agent) — port 8787
```bash
cd backend
npm install
cp .env.example .env     # fill SUI_PRIVATE_KEY (Sessions wallet), OLLAMA_KEY, MEMWAL_* — see .env.example
npm run test:memory      # optional: remember()+recall() smoke test on mainnet, prints a blob_id
npm run serve            # agent → http://localhost:8787
```

### Frontend (app) — port 3000
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_AGENT_URL=http://localhost:8787" > .env.local
npm run dev              # → http://localhost:3000
```

### Smart contract
```bash
cd smart-contract
sui move build && sui move test      # already published — no need to re-deploy
```

**Prerequisites:** a Sui mainnet wallet (Sessions) funded with **WAL** (storage) + **SUI** (gas).

---

## 8. Hackathon requirement compliance

| Requirement | Status | Notes |
|---|---|---|
| Live on Walrus **Mainnet** + Walrus Memory | ✅ | Real MemWal SDK on mainnet, account `0x5429…ffc24`, relayer `relayer.memory.walrus.xyz` |
| Genuine persistent memory (impossible on day 1) | ✅ | cross-session recall quoting the user's prior predictions (verified) |
| All state/memory on Walrus | ✅ | append-only blobs + on-chain receipt anchoring `blob_id` |
| Before/after (Day 1 vs Day 4+) | ✅ | respect & persona move with **real** resolved results |
| Public interface where memory is visible | ✅ | **https://cakalele.vercel.app** — chat + Receipt/Respect dashboard (Suiscan links) |
| Dedicated Sessions wallet | ✅ | `signalvault` `0xe7d9…1d11` (WAL+SUI), contract publisher |
| Trust-anchor contract live (Sui Mainnet) | ✅ | `pundit` package `0xe121…136f`, build + 8/8 tests pass |
| Live link (app + agent) | ✅ | Vercel app + Railway agent (`/health` 200) |
| Real match-result oracle (no fabricated verdicts) | ✅ | TheSportsDB + LLM judge; no result → stays Pending |
| Demo video < 3 min | ⬜ | cold-open before/after |
| Submit Airtable + DeepSurge | ⬜ | + name, logo, description, website, repo |
| Feedback form + GitHub tickets | 🟡 | real bug found: `@mysten/sui` v2 client rename breaks MemWal pre-alpha (Best Feedback path) |
| Join Discord + post X #Walrus | 🟡 | |

---

## 9. Technical honesty & limitations

Deliberately transparent (overclaiming invites attack during Q&A):

- **Not "fully decentralized."** MemWal uses a Mysten relayer + centralized vector index; the LLM is centralized too. What is **on-chain & decentralized** is the **prediction blob + pointer/ownership on Sui** — the part that matters for receipt verifiability.
- **MemWal is pre-alpha.** We hit real bugs (e.g. `@mysten/sui` v2 renamed the JSON-RPC client, breaking MemWal's account ops) and document them as GitHub tickets.
- **The oracle is a trusted point.** The verdict (correct/wrong) is decided off-chain from real match data, then recorded on-chain by the `OracleCap` holder. Match results come from TheSportsDB (free tier → limited/lagging WC2026 coverage; matches without a result stay Pending — never fabricated).
- **OracleCap recovery, not revocation.** `OracleAdminCap` can mint a replacement cap if the operational one is lost, but does not revoke a leaked one — an acknowledged limitation.
- **Content guardrail.** The "arrogant" persona is constrained to **never** produce racial/national/physical insults — a deliberate design decision; it only roasts prediction quality.

---

## 10. Team, License & Contact

- **Team:** _(fill in team name & members)_
- **Website / Live:** **https://cakalele.vercel.app** · Agent API: `https://cakalele-production-b226.up.railway.app`
- **Sessions wallet:** `0xe7d9532d086478c1e1cc6914e74929814118e4de35ffd8b9a326a0bd8ef91d11` (`signalvault`)
- **Contract (Sui Mainnet):** package `0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f` — [details](./smart-contract/deployments.mainnet.md)
- **License:** MIT
- **Contact:** _(fill in email / Discord)_

---

<div align="center">

**The Bitter Pundit — *The Receipt***
*Built on Walrus Mainnet · Powered by Walrus Memory (MemWal)*
🐋 #Walrus

</div>
