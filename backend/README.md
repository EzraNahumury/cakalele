# pundit-backend

Agent backend for The Bitter Pundit. Saat ini berisi **MemWal thin slice** (go/no-go untuk
Walrus Memory di mainnet). Orchestrator (persona engine + LLM + oracle) menyusul.

## Stack memory (terverifikasi)

- SDK: [`@mysten-incubation/memwal`](https://github.com/MystenLabs/MemWal) `0.0.7` (pre-alpha).
- Peer: `@mysten/sui` `>=2.5.0`, `@mysten/seal` `>=1.1.0`, `@mysten/walrus` `>=1.0.3`, `ai`, `zod`.
- Auth: **Ed25519 delegate key**. Sessions wallet membuat `MemWalAccount` on-chain (1 per wallet),
  lalu menambah delegate key; SDK dipakai dengan delegate key (bukan raw wallet key).
- Mainnet: relayer `https://relayer.memory.walrus.xyz`, package
  `0xcee7a6fd…24c6`, registry `0x0da982ce…7edd`.

API inti: `MemWal.create({key,accountId,serverUrl,namespace})` → `remember(text)` → `waitForRememberJob(job_id)` (→ `blob_id`) → `recall({query,topK})` (→ `{results:[{blob_id,text,distance}]}`).

## Jalankan thin slice

```bash
cd backend
npm install
cp .env.example .env          # isi SUI_PRIVATE_KEY (Sessions wallet, funded WAL+SUI)
npm run test:memory
```

Run pertama otomatis: `generateDelegateKey` → `createAccount` → `addDelegateKey` (2 tx Sui mainnet),
lalu `remember` (upload blob Walrus, butuh WAL) → `recall`. Script mencetak `MEMWAL_ACCOUNT_ID` +
`MEMWAL_DELEGATE_KEY` — **simpan ke `.env`** agar run berikutnya reuse (kontrak izinkan 1 account/wallet).

Output sukses: `✅ GO — MemWal round-trip on mainnet complete. blob_id = …`.

### ✅ Hasil go/no-go (14 Jun 2026) — GO

Thin slice sukses di **mainnet** dgn wallet `signalvault`:
- `createAccount` tx `61QJLHCZS32tFcsz9xf4ERxWBsjZEiTa33tXidQeo5HX`
  → MemWalAccount `0x542985659c3ca77a97bcf4857c786b2a6bfd2ebbcfaf3fd26e019a258c6ffc24`
- `addDelegateKey` tx `DP1GjFE9Lm7chPHp7YQw1WpobpF3izAkG92LFxrna81C`
- `remember()` → blob `DWNWcP5idLFzGi-JeKQ8gPguWxaV75SMCXzQw3TNb2c` (namespace `pundit-smoke`)
- `recall()` → mengembalikan memory di atas (+ entry berikutnya) dgn distance — **persistensi semantik lintas-proses terbukti.**

**Catatan penting (latency index):** `recall()` baru menemukan memory ~1–beberapa menit setelah
`remember()` selesai (embedding/index relayer async). Tepat setelah commit, `recall` bisa `total:0`;
ini normal — beri jeda atau retry. `restore(namespace)` me-rebuild index dari blob Walrus.

**Relayer:** `https://relayer.memory.walrus.xyz` (production, relayer v0.1.0, apiVersion 1.0.0).
Header `x-delegate-key` deprecated → migrasi ke `x-seal-session` saat relayer naik ke API v2.

## Agent orchestrator

Inti agen ada di `src/`:

| File | Tugas |
|---|---|
| `config.mjs` | env + default id (MemWal/pundit mainnet, Ollama, RPC) |
| `llm.mjs` | Ollama Cloud `/api/chat` (`OLLAMA_*`) |
| `memory.mjs` | MemWal `recall()` / `remember()` (delegate key) |
| `onchain.mjs` | baca `PunditProfile` (respect/state) dari Sui mainnet |
| `persona.mjs` | system prompt dinamis "The Bitter Pundit" per relationship_state + inject memory ter-recall |
| `agent.mjs` | `respond()` — recall → baca profil → persona → LLM → (opsional) remember |
| `server.mjs` | HTTP `POST /chat` + `GET /health` (buat frontend) |

Loop tiap turn: `recall(pesan)` dari Walrus → baca respect/state on-chain → bangun persona →
Ollama balas (mengutip memory verbatim) → opsional `remember()` prediksi baru.

```bash
npm run agent:demo     # demo 2-turn (read-only; DEMO_STORE=1 utk remember, spend WAL)
npm run serve          # HTTP agent di :8787  → POST /chat { message, namespace, profileId, storePrediction }
```

LLM: Ollama Cloud. `qwen3.5-cloud` butuh subscription (403); default dipakai `qwen3-vl:235b-instruct`
(ubah via `OLLAMA_MODEL`). Demo terbukti: recall 2 memory Walrus + profil on-chain → balasan
pundit yang mengutip prediksi lama user.

## Keamanan

- `.env` di-gitignore (root `.gitignore`). Jangan commit `SUI_PRIVATE_KEY`/`MEMWAL_DELEGATE_KEY`.
- Delegate key terbatas (bisa di-`removeDelegateKey`) — jangan pakai raw Sessions key di SDK.
