# Deploy — The Bitter Pundit (CAKALELE)

Contract sudah live di Sui mainnet (lihat `smart-contract/deployments.mainnet.md`).
Sisa: **backend** (Railway) lalu **frontend** (Vercel). Urutan wajib backend dulu — URL backend
dipakai saat build frontend.

---

## 1. Backend → Railway

1. railway.app → **New Project → Deploy from GitHub repo** → pilih `EzraNahumury/cakalele`.
2. Service settings:
   - **Root Directory:** `backend`
   - Start command: `npm run serve` (sudah di `backend/railway.json` + `Procfile`)
   - Healthcheck: `/health` (sudah diset)
3. **Variables** (Settings → Variables) — salin nilai dari `backend/.env` lokal:

   | Var | Nilai |
   |---|---|
   | `SUI_NETWORK` | `mainnet` |
   | `SUI_PRIVATE_KEY` | *(dari .env — wallet Sessions, RAHASIA)* |
   | `OLLAMA_HOST` | `https://ollama.com` |
   | `OLLAMA_KEY` | *(dari .env, RAHASIA)* |
   | `OLLAMA_MODEL` | `qwen3-vl:235b-instruct` |
   | `MEMWAL_SERVER_URL` | `https://relayer.memory.walrus.xyz` |
   | `MEMWAL_PACKAGE_ID` | `0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6` |
   | `MEMWAL_REGISTRY_ID` | `0x0da982cefa26864ae834a8a0504b904233d49e20fcc17c373c8bed99c75a7edd` |
   | `MEMWAL_NAMESPACE` | `pundit-smoke` |
   | `MEMWAL_ACCOUNT_ID` | `0x542985659c3ca77a97bcf4857c786b2a6bfd2ebbcfaf3fd26e019a258c6ffc24` |
   | `MEMWAL_DELEGATE_KEY` | *(dari .env, RAHASIA)* |
   | `PUNDIT_ORACLE_CAP_ID` | `0x39e9dbc5cfbbb4c12534d2da14423a65aff2c336fcc24cc4941724770928f8f0` |

   > Railway set `PORT` otomatis — server sudah baca `process.env.PORT`.
4. Deploy → **Settings → Networking → Generate Domain**. Catat URL, mis. `https://cakalele-backend.up.railway.app`.
5. Cek: buka `https://<url>/health` → `{"status":"ok"}`.

---

## 2. Frontend → Vercel

1. vercel.com → **Add New → Project** → import `EzraNahumury/cakalele`.
2. **Root Directory:** `frontend` (framework auto-detect: Next.js).
3. **Environment Variables:**
   - `NEXT_PUBLIC_AGENT_URL` = URL Railway dari langkah 1 (tanpa trailing slash).
   - (opsional) `NEXT_PUBLIC_PUNDIT_PACKAGE_ID`, `NEXT_PUBLIC_PUNDIT_REGISTRY_ID` — default sudah di-bake.
4. Deploy. Dapat URL `https://cakalele.vercel.app`.
   > `NEXT_PUBLIC_*` di-bake saat build — kalau ubah, **redeploy**.
5. CORS sudah `*` di backend, jadi domain Vercel bisa manggil Railway.

---

## 3. Verifikasi

- Buka URL Vercel → connect wallet → otomatis ke `/play`.
- Chat → agent balas (badge **online**). Respect/Receipt dashboard keisi dari mainnet.
- Pakai URL Vercel sebagai **live link** di submission + demo video.

## Keamanan
- `SUI_PRIVATE_KEY`, `OLLAMA_KEY`, `MEMWAL_DELEGATE_KEY` HANYA di env host — jangan commit.
- Pertimbangkan rotate `OLLAMA_KEY` + MemWal delegate key (sempat ke-ekspos saat dev).
