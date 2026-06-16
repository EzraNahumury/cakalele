<div align="center">

<img src="frontend/public/logo1.png" alt="CAKALELE — The Bitter Pundit" width="150" />

# 🧠⚽ The Bitter Pundit — *The Receipt*

### Agen AI suporter garis keras yang **menyimpan setiap prediksimu sebagai bukti on-chain yang tak bisa kau hapus** — lalu hubungannya denganmu berevolusi dari meremehkan → respek → bergantung, berdasarkan *track record* yang terbukti.

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
| 🤖 **Agent API** | https://cakalele-production-ab1d.up.railway.app/health |
| 📜 **Contract (Suiscan)** | [`pundit` package](https://suiscan.xyz/mainnet/object/0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f) |
| 💾 **Repo** | https://github.com/EzraNahumury/cakalele |

---

> **TL;DR** — The Bitter Pundit adalah agen AI berkepribadian pundit sepak bola yang sombong. Bedanya dengan "roast bot" biasa: **setiap prediksimu di-*commit* ke Walrus dengan timestamp SEBELUM kickoff**, jadi agen punya **bukti on-chain** yang tak bisa kau bantah atau edit. Memory-nya **episodik** (mengutip kata-katamu sendiri, bukan sekadar skor), dan **hubungan kalian punya arc**: agen yang awalnya meremehkanmu bisa berubah respek — bahkan jadi *insecure* dan mengemis tips — kalau prediksimu terbukti jitu. Kemenanganmu melawan kesombongannya adalah *game*-nya. Walrus bukan tempelan; ia adalah **buku catatan permanen yang membuat seluruh konsep ini mungkin.**

---

## 📑 Daftar Isi

1. [Masalah & Insight](#1-masalah--insight)
2. [Solusi: The Bitter Pundit](#2-solusi-the-bitter-pundit)
3. [Kenapa Ini Butuh Walrus (Bukan Database Biasa)](#3-kenapa-ini-butuh-walrus-bukan-database-biasa)
4. [Arsitektur Sistem](#4-arsitektur-sistem)
5. [Cara Kerja Memory (MemWal)](#5-cara-kerja-memory-memwal)
6. [Commit–Reveal: Receipt yang Tak Terbantahkan](#6-commitreveal-receipt-yang-tak-terbantahkan)
7. [Evolusi Hubungan — *The Respect Arc*](#7-evolusi-hubungan--the-respect-arc)
8. [Before / After (Memory Depth)](#8-before--after-memory-depth)
9. [Fitur Utama](#9-fitur-utama)
10. [Alur Pengguna (User Journey)](#10-alur-pengguna-user-journey)
11. [Struktur Data Memory](#11-struktur-data-memory)
12. [Tech Stack](#12-tech-stack)
13. [Setup & Menjalankan](#13-setup--menjalankan)
14. [Skenario Demo (3 Menit)](#14-skenario-demo-3-menit)
15. [Roadmap / Build Plan](#15-roadmap--build-plan)
16. [Pemenuhan Requirement Hackathon](#16-pemenuhan-requirement-hackathon)
17. [Kejujuran Teknis & Keterbatasan](#17-kejujuran-teknis--keterbatasan)
18. [Tim, Lisensi & Kontak](#18-tim-lisensi--kontak)

---

## 1. Masalah & Insight

Setiap turnamen besar, jutaan fans membuat prediksi panas di grup chat dan media sosial — lalu **diam-diam menghapus jejaknya** saat prediksi itu meleset. Tidak ada *akuntabilitas*. Tidak ada *receipt*. "Aku kan sudah bilang dari awal!" adalah kebohongan favorit setiap suporter.

> **Insight inti:** Yang membuat banter sepak bola menyenangkan bukan prediksinya — tapi **menagih orang atas prediksi yang mereka coba lupakan.** Itu butuh memori yang *permanen, bertimestamp, dan tak bisa dimanipulasi.* Persis kekuatan inti Walrus.

The Bitter Pundit mengubah ini jadi pengalaman: sebuah agen yang **tidak akan pernah lupa, tidak bisa kau suap, dan punya bukti on-chain.**

---

## 2. Solusi: The Bitter Pundit

The Bitter Pundit adalah agen AI dengan kepribadian **pundit sepak bola arogan-tapi-cerdas** yang menemanimu sepanjang Piala Dunia 2026. Ia melakukan tiga hal yang tidak dilakukan bot prediksi biasa:

| | Bot prediksi biasa | **The Bitter Pundit** |
|---|---|---|
| **Memori** | Logging skor di database | **Memory episodik on-chain** — mengutip prediksi spesifikmu verbatim |
| **Bukti** | "Percaya saja" | **Receipt on-chain** bertimestamp sebelum kickoff (tak bisa di-*backdate*) |
| **Relasi** | Statis | **Arc dinamis** — meremehkan → respek → bergantung (*Respect Score*) |
| **Tujuan user** | Lihat statistik | **Taklukkan kesombongannya** — raih respek lewat prediksi akurat |

**Bukan sekadar di-roast.** Roast hanyalah salah satu kondisi. *Game* sebenarnya: membuktikan pada agen yang sombong ini bahwa kamu layak dihormati. Kalau berhasil, kamu akan melihat momen yang langka & memuaskan — agen yang dulu menghinamu kini **mengakui kamu benar dan mengemis tips prediksi darimu.**

---

## 3. Kenapa Ini Butuh Walrus (Bukan Database Biasa)

Ini pertanyaan terpenting bagi juri: *"Tukar Walrus dengan Postgres — apa yang hilang?"* Jawaban kami konkret:

| Properti | Postgres / DB biasa | **Walrus + Sui** | Kenapa penting di sini |
|---|---|---|---|
| **Immutability** | Bisa di-`UPDATE`/`DELETE` diam-diam | Blob **content-addressed** (`blob_id` = hash konten), tak bisa diubah | Receipt prediksi **tak bisa di-edit** setelah dibuat — pondasi "menagih" |
| **Anti-backdating** | Timestamp bisa dipalsukan server | Di-*commit* on-chain via Sui **sebelum** hasil laga | Membuktikan kamu prediksi sebelum tahu hasilnya |
| **Verifiability** | Harus percaya server kami | Siapa pun bisa verifikasi `blob_id` di Suiscan | User & juri bisa cek bukti sendiri |
| **Persistence** | Hilang kalau server kami mati | Hidup di jaringan terdesentralisasi (per-epoch) | Track record turnamen tetap ada |
| **Auditable history** | Overwrite menghapus jejak | **Append-only** — tiap prediksi blob terpisah | "Receipt" = audit trail nyata, bukan 1 baris yang ditimpa |

> **Kesimpulan:** Konsep inti — *"prediksimu adalah bukti permanen yang akan ditagihkan"* — **tidak mungkin** dengan database mutable biasa. Walrus bukan checkbox hackathon; ia adalah mekanisme yang membuat produk ini bekerja.

### ❌ Anti-pattern yang kami HINDARI (jebakan juri)

Kami **tidak** melakukan `walrus put state.json` lalu meng-*overwrite*-nya tiap sesi. Itu memperlakukan Walrus seperti key-value store mutable — padahal blob Walrus **immutable**, sehingga "overwrite" hanya menghasilkan blob yatim tanpa pointer. Sebagai gantinya kami memakai **MemWal SDK** dengan pola **append-only + namespace + semantic recall** (lihat §5).

---

## 4. Arsitektur Sistem

```mermaid
flowchart TB
    subgraph Client["🖥️ Frontend — Public Interface"]
        UI["Chat UI (gaya koran olahraga jadul)"]
        DASH["Receipt & Respect Dashboard"]
        WALLET["Sui Wallet Connect (dApp Kit)"]
    end

    subgraph Backend["⚙️ Agent Backend / Orchestrator"]
        API["API Layer"]
        PERSONA["Persona Engine<br/>(system prompt dinamis dari memory)"]
        LLM["LLM (Claude)"]
        ORACLE["Match Result Oracle<br/>(API hasil bola)"]
    end

    subgraph MemoryLayer["🧠 Walrus Memory — MemWal SDK"]
        MEMWAL["@mysten-incubation/memwal<br/>remember() · recall() · restore()"]
        RELAYER["MemWal Relayer<br/>(encrypt · embed · index)"]
    end

    subgraph Chain["⛓️ Mainnet"]
        WALRUS[("Walrus Blobs<br/>immutable · content-addressed")]
        SUI[("Sui Objects<br/>ownership + pointer versi terbaru")]
    end

    UI --> API
    DASH --> API
    WALLET -->|namespace / identitas| API
    API --> PERSONA
    PERSONA --> LLM
    ORACLE -->|hasil laga| PERSONA
    PERSONA <-->|remember / recall| MEMWAL
    MEMWAL --> RELAYER
    RELAYER -->|tulis blob terenkripsi| WALRUS
    RELAYER -->|pointer + ownership| SUI
    DASH -.->|verifikasi blob_id| SUI
```

**Alur singkat:** wallet user → identitas/namespace memory → setiap prediksi disimpan via `remember()` (jadi blob immutable + pointer Sui) → saat sesi baru, `recall()` menarik memory episodik secara semantik → Persona Engine memilih *tone* + mengutip prediksi lama → LLM membalas → Dashboard menampilkan receipt yang bisa diverifikasi on-chain.

---

## 5. Cara Kerja Memory (MemWal)

Kami memakai **Walrus Memory (codename MemWal)** — bukan storage mentah. MemWal menambah **enkripsi, embeddings, dan semantic recall** di atas Walrus, dengan API: `remember()`, `recall()`, `restore()`, `waitForRememberJob()`.

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant BE as Agent Backend
    participant MW as MemWal SDK
    participant CH as Walrus + Sui (Mainnet)
    participant O as Match Oracle

    rect rgb(235, 245, 255)
    Note over U,CH: FASE 1 — COMMIT (sebelum kickoff)
    U->>FE: "Argentina menang 3-0, Messi hattrick"
    FE->>BE: prediksi + waktu
    BE->>MW: remember(content, namespace = wallet)
    MW->>CH: tulis blob immutable + Sui pointer
    CH-->>MW: blob_id + objectId
    MW-->>BE: receipt { blob_id, committedAt }
    BE-->>FE: "Tercatat & on-chain. Tak bisa kau hapus."
    end

    rect rgb(255, 240, 235)
    Note over U,CH: FASE 2 — REVEAL (setelah hasil keluar, Day 4+)
    O->>BE: hasil resmi: Prancis 2-1, Messi gagal penalti
    U->>FE: login kembali (Day 4)
    FE->>BE: sesi baru
    BE->>MW: recall("prediksi & opini user soal Argentina/Messi")
    MW->>CH: baca blob via pointer terbaru
    CH-->>MW: histori prediksi + akurasi (episodik)
    MW-->>BE: konteks memory
    BE->>BE: hitung Respect Score → pilih persona
    BE-->>FE: ROAST yang MENGUTIP prediksi lama + link blob_id
    end
```

### Contoh integrasi (ilustratif)

> ⚠️ Nama API mengikuti dokumentasi MemWal (status **beta**). Selalu verifikasi terhadap [docs resmi](https://docs.wal.app/walrus-memory/getting-started/what-is-walrus-memory) & [repo MystenLabs/MemWal](https://github.com/MystenLabs/MemWal) saat implementasi.

```ts
import { MemWal } from "@mysten-incubation/memwal";

const mem = new MemWal({
  network: "mainnet",
  signer: sessionKeypair, // wallet khusus Walrus Sessions
});

// ── COMMIT: simpan prediksi sebagai memory episodik (append-only) ──
const { blobId, jobId } = await mem.remember({
  namespace: userWalletAddress,          // isolasi memory per-user
  content: {
    type: "prediction",
    match: "ARG vs FRA",
    claim: "Argentina menang 3-0, Messi hattrick",
    confidence: "high",
    committedAt: timestampSebelumKickoff, // anti-backdating
  },
  tags: ["prediction", "ARG", "messi"],
});
await mem.waitForRememberJob(jobId);       // tunggu blob ter-sertifikasi on-chain

// ── RECALL: tarik memory relevan secara semantik di awal sesi ──
const memories = await mem.recall({
  namespace: userWalletAddress,
  query: "prediksi dan opini user tentang Argentina dan Messi",
  topK: 5,
});
// → memories dipakai Persona Engine untuk roast yang MENGUTIP kata-kata user
```

**Kenapa ini "agent memory" sungguhan, bukan file storage:**
- `recall()` melakukan **semantic retrieval** — agen menarik *opini relevan* ("kamu benci Prancis"), bukan memuat satu blob mentah.
- **Append-only** → tiap prediksi jadi entry terpisah → riwayat lengkap = bahan "Receipt".
- **Namespace per-wallet** → isolasi & ownership memory yang benar.
- Blob **terenkripsi** by default (privasi state psikologis user).

---

## 6. Commit–Reveal: Receipt yang Tak Terbantahkan

Inilah yang membuat roast kami **tidak bisa dibantah**. Karena blob Walrus immutable & bertimestamp on-chain, agen bisa membuktikan kamu membuat prediksi **sebelum** hasil diketahui.

```mermaid
flowchart LR
    A["🗣️ User prediksi"] --> B["⏱️ Timestamp dicatat<br/>SEBELUM kickoff"]
    B --> C["📝 remember() →<br/>blob immutable + Sui pointer"]
    C --> D["🔒 blob_id terkunci on-chain<br/>(hash konten = tak bisa diubah)"]
    D --> E["⚽ Pertandingan berlangsung"]
    E --> F["📊 Oracle: hasil resmi masuk"]
    F --> G["⚖️ Bandingkan klaim vs hasil"]
    G --> H["🔥 REVEAL: agen mengutip blob_id<br/>'Kau bilang 3-0 pada 13 Jun 14:00,<br/>sebelum laga. Buktinya di sini →'"]
```

> Tanpa commit-reveal, "receipt" tidak lebih kuat dari baris database. **Dengan** commit-reveal on-chain, agen punya senjata yang mustahil dibantah — dan itu jauh lebih lucu serta lebih kredibel di mata juri.

---

## 7. Evolusi Hubungan — *The Respect Arc*

Memory tidak hanya mengubah *isi* balasan, tapi *kepribadian* agen. **Respect Score** (diturunkan dari akurasi historis yang ter-recall dari Walrus) menggerakkan state machine berikut:

```mermaid
stateDiagram-v2
    [*] --> Skeptis: Day 1 — netral & standar
    Skeptis --> Rival: prediksi meleset
    Skeptis --> Naik: prediksi tepat
    Rival --> Rival: terus meleset (roast eskalasi)
    Rival --> Naik: mulai akurat lagi
    Naik --> Respek: akurasi konsisten
    Respek --> Oracle: track record elite
    Oracle --> Insecure: agen bergantung, mulai mengemis tips
    Respek --> Rival: kembali sering meleset
    Insecure --> Rival: performa user kolaps

    note right of Oracle
        Momen "mustahil di Day 1":
        agen mengutip prediksi lamamu
        + tunjukkan bukti blob_id on-chain
    end note
```

| State | Pemicu | Perilaku Agen |
|---|---|---|
| **Skeptis** | Day 1, belum ada data | Sopan, standar, sedikit meremehkan |
| **Rival** | Akurasi rendah | Arogan, roast (mengutip prediksi gagalmu) |
| **Naik** | Akurasi membaik | Mulai mengakui, tapi gengsi |
| **Respek** | Akurasi konsisten | Menghormati, menyimak analisismu |
| **Oracle → Insecure** | Track record elite | Defensif, bergantung, **mengemis tips** |

> **Retensi via progresi, bukan hukuman.** Roast murni membuat user kabur (kurva kelelahan). Arc "taklukkan kesombongannya" memberi **tujuan** untuk kembali setiap matchday.

---

## 8. Before / After (Memory Depth)

Kriteria #1 hackathon: agen harus melakukan sesuatu yang **mustahil di Day 1**. Inilah kontrasnya:

| Aspek | **Day 1** (tanpa memory) | **Day 4+** (memory ter-recall dari Walrus) |
|---|---|---|
| Sapaan | "Halo. Mau prediksi apa hari ini?" | "Ah, si 'ahli taktik' balik lagi. Masih berani pegang Argentina?" |
| Referensi | Tidak ada | **Mengutip verbatim:** *"4 hari lalu kau bilang 'Messi hattrick lawan Prancis'."* |
| Bukti | — | **Link `blob_id` on-chain** (Suiscan) bertimestamp pra-kickoff |
| Tone | Skeptis-standar | Ditentukan **Respect Score** (Rival / Respek / Insecure) |
| Kemampuan | Generik | **Mustahil tanpa riwayat 4+ hari nyata di Walrus** |

```mermaid
timeline
    title Perjalanan Memory Sepanjang Turnamen
    Day 1 : Prediksi di-commit on-chain : Agen skeptis-standar
    Day 2 : Prediksi baru : Hasil laga pertama masuk
    Day 3 : Akurasi terakumulasi : Respect Score bergerak
    Day 4+ : Agen recall riwayat : Roast/Respek mengutip prediksi lama + bukti blob_id
```

---

## 9. Fitur Utama

- 🧠 **Memory episodik on-chain** — agen mengingat & mengutip prediksi spesifikmu via MemWal `recall()`.
- 🧾 **Immutable Receipt (commit-reveal)** — bukti prediksi bertimestamp sebelum kickoff, tak bisa di-backdate/edit.
- 🎭 **Respect Arc** — kepribadian agen berevolusi (Skeptis → Rival → Respek → Oracle/Insecure).
- 📊 **Receipt & Respect Dashboard** — interface publik: timeline prediksi + grafik Respect, tiap titik bisa di-*trace* ke entry Walrus.
- 🔥 **Shareable Roast** — satu klik bagikan ejekan terpedas ke X dengan **#Walrus** (template terkurasi agar selalu spesifik & tajam).
- 🔗 **Bukti verifiable** — link `blob_id`/Sui object di explorer langsung dari UI.
- 🔐 **Login wallet Sui** — identitas + namespace memory; tanpa email/password.

---

## 10. Alur Pengguna (User Journey)

```mermaid
flowchart TD
    A["🔗 Connect Sui Wallet"] --> B{Pengguna baru?}
    B -- Ya --> C["Pilih tim jagoan + tim rival"]
    B -- Tidak --> D["recall() memory dari Walrus"]
    C --> E["Buat prediksi laga"]
    D --> F["Persona Engine muat tone sesuai Respect Score"]
    E --> G["COMMIT prediksi on-chain (remember)"]
    F --> H["💬 Chat: agen kutip prediksi lama + roast/respek"]
    G --> H
    H --> I["⚽ Hasil laga masuk (Oracle)"]
    I --> J["Update akurasi + Respect Score"]
    J --> K["📊 Dashboard: Receipt + grafik Respect"]
    K --> L["📣 Share roast ke X #Walrus"]
    L --> H
```

---

## 11. Struktur Data Memory

Kami memisahkan **entry episodik** (append-only, disimpan permanen) dari **state turunan** (dihitung saat runtime dari hasil `recall()`).

**Entry episodik — satu blob per prediksi (immutable):**
```json
{
  "type": "prediction",
  "match": "ARG vs FRA",
  "claim": "Argentina menang 3-0, Messi hattrick",
  "confidence": "high",
  "committedAt": "2026-06-13T14:00:00Z",
  "wallet": "0xUSER…",
  "tags": ["prediction", "ARG", "messi"]
}
```

**State turunan — dihitung dari banyak entry yang di-recall (tidak disimpan, atau disimpan sebagai snapshot baru):**
```json
{
  "team_loyalty": "Argentina",
  "rivals": ["Prancis"],
  "accuracy_score": "0/3",
  "respect_score": 12,
  "relationship_state": "Rival",
  "last_roasted": "messi_penalty_miss"
}
```

> Setiap update = **blob baru** + pointer Sui ke versi terbaru. Riwayat lama **tetap ada** (audit trail) — itulah yang membuat "Receipt" bermakna.

---

## 12. Tech Stack

| Lapisan | Teknologi |
|---|---|
| **Frontend** | React/Next.js, Sui dApp Kit (wallet), CSS gaya "koran olahraga jadul" |
| **Backend** | Node.js / TypeScript, API orchestrator |
| **LLM** | Claude (persona engine — system prompt dinamis) |
| **Memory** | **MemWal** (`@mysten-incubation/memwal`) — `remember` / `recall` / `restore` |
| **Storage / Chain** | **Walrus Mainnet** (blob) + **Sui** (ownership & pointer) |
| **Data laga** | API hasil pertandingan publik (atau input semi-manual bertimestamp sebagai fallback) |
| **Sharing** | X (Twitter) Web Intent dengan #Walrus |

---

## 13. Setup & Menjalankan

Monorepo: `frontend/` (Next.js app), `backend/` (agent: MemWal + persona/LLM + oracle), `smart-contract/` (Move).
**Live:** app di Vercel, agent di Railway, contract di Sui mainnet. Langkah deploy lengkap: [DEPLOY.md](./DEPLOY.md).

### Backend (agent) — port 8787
```bash
cd backend
npm install
cp .env.example .env     # isi SUI_PRIVATE_KEY (Sessions wallet), OLLAMA_KEY, MEMWAL_* — lihat .env.example
npm run test:memory      # opsional: smoke remember()+recall() ke mainnet, cetak blob_id
npm run serve            # agent → http://localhost:8787  (GET /health, POST /chat)
```

### Frontend (app) — port 3000
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_AGENT_URL=http://localhost:8787" > .env.local
npm run dev              # → http://localhost:3000
```

### Oracle (resolve hasil laga, butuh OracleCap)
```bash
cd backend
npm run oracle -- settle <profileId> <receiptId> <matchId> <correct|wrong> "<hasil resmi>"
```

**Prasyarat:** wallet Sui mainnet (Sessions) terisi **WAL** (storage per-epoch) + **SUI** (gas). Smart contract sudah ter-publish — tak perlu re-deploy (lihat [smart-contract/deployments.mainnet.md](./smart-contract/deployments.mainnet.md)).

---

## 14. Skenario Demo (3 Menit)

Struktur **cold-open** — payoff dulu, baru penjelasan (juri memutuskan dalam 10–15 detik pertama):

```mermaid
flowchart LR
    T1["0–15s<br/>🔥 Roast terpedas +<br/>grafik Respect anjlok 80→5"] --> T2["15–45s<br/>Split-screen Day 1 (sopan)<br/>vs Day 4 (brutal)"]
    T2 --> T3["45–120s<br/>Agen RECALL prediksi spesifik +<br/>bukti blob_id di Suiscan"]
    T3 --> T4["120–150s<br/>Path 'Oracle': agen jadi insecure<br/>+ reaksi manusia di kamera"]
    T4 --> T5["150–170s<br/>Share roast ke X #Walrus"]
```

**Aturan demo:** jangan simulasi 4 hari dalam satu take. Tunjukkan **dua blob bertimestamp beda** di explorer sebagai bukti before/after genuine. (Karena itu: **mulai pakai agen dengan laga riil hari ini.**)

---

## 15. Roadmap / Build Plan

```mermaid
gantt
    title Build Plan (deadline 24 Juni 2026)
    dateFormat YYYY-MM-DD
    axisFormat %d Jun
    section Pondasi (kritis)
    Wallet Sessions + isi WAL/SUI      :a1, 2026-06-13, 1d
    Thin slice remember/recall mainnet :a2, 2026-06-13, 2d
    Mulai akumulasi riwayat nyata      :a3, 2026-06-14, 9d
    section Core MVP
    Persona Engine + LLM               :b1, 2026-06-15, 3d
    Commit-reveal + Oracle hasil laga  :b2, 2026-06-16, 3d
    Chat UI + wallet login             :b3, 2026-06-17, 3d
    Receipt & Respect Dashboard        :b4, 2026-06-19, 2d
    Share-to-X #Walrus                 :b5, 2026-06-20, 1d
    section Finalisasi
    Feature freeze                     :milestone, 2026-06-21, 0d
    Deploy stabil + rekam demo         :c1, 2026-06-22, 2d
    Submit (Airtable/DeepSurge) + X    :c2, 2026-06-24, 1d
```

**Prinsip alokasi waktu: 70% ke jalur Walrus/wallet/on-chain, 30% ke LLM/UI.** Risiko ada di lapisan storage, bukan di prompt.

---

## 16. Pemenuhan Requirement Hackathon

| Requirement | Status | Catatan |
|---|---|---|
| Live di Walrus **Mainnet** + Walrus Memory | ✅ Done | MemWal SDK asli (`remember`/`recall`) di mainnet, account `0x5429…ffc24`, relayer `relayer.memory.walrus.xyz` |
| Genuine persistent memory (mustahil Day 1) | ✅ Done | recall lintas-sesi mengutip prediksi lama user (terverifikasi) |
| Semua state/memory di Walrus | ✅ Done | blob append-only + receipt on-chain anchor `blob_id` |
| Before/after (Day 1 vs Day 4+) | ✅ Done | respect **50/Skeptic → 100/Oracle** setelah 2 resolve; persona berubah |
| Interface publik tempat memory terlihat | ✅ Done | **https://cakalele.vercel.app** — chat + Receipt/Respect dashboard (link Suiscan) |
| Wallet khusus Sessions | ✅ Done | `signalvault` `0xe7d9…1d11` (WAL+SUI), publisher contract |
| Trust-anchor contract live (Sui Mainnet) | ✅ Done | `pundit` PACKAGE `0xe121…136f`, build+8/8 test PASS — lihat [smart-contract/deployments.mainnet.md](./smart-contract/deployments.mainnet.md) |
| Live link (app + agent) | ✅ Done | app Vercel + agent Railway (`/health` 200) |
| Demo video < 3 menit | ⬜ To-do | Struktur cold-open (§14) |
| Submit Airtable + DeepSurge | ⬜ To-do | + nama, logo, deskripsi, website, repo |
| Feedback form + GitHub tickets | 🟡 WIP | bug nyata ditemukan: `@mysten/sui` v2 rename client → MemWal pre-alpha break (jalur Best Feedback) |
| Join Discord + post X #Walrus | 🟡 WIP | Share-to-X bagian core loop |

---

## 17. Kejujuran Teknis & Keterbatasan

Kami sengaja transparan (klaim berlebihan mengundang serangan saat Q&A):

- **Bukan "fully decentralized".** MemWal memakai relayer Mysten + index vektor terpusat; LLM juga terpusat. Yang **on-chain & terdesentralisasi** adalah **blob prediksi + pointer/ownership di Sui** — dan itulah bagian yang penting untuk verifiability receipt.
- **MemWal status beta.** Kami mengantisipasi bug & akan mendokumentasikannya sebagai GitHub tickets (sekaligus memenuhi syarat feedback hackathon).
- **Epoch & biaya.** Penyimpanan butuh WAL/SUI per write; `epochs` disetel agar memory hidup melewati masa penjurian.
- **Guardrail konten.** Persona "arogan" dibatasi agar **tidak** menghasilkan hinaan rasial/nasional — keputusan desain sadar, bukan kelalaian.

---

## 18. Tim, Lisensi & Kontak

- **Tim:** _(isi nama tim & anggota)_
- **Website / Live:** **https://cakalele.vercel.app** · Agent API: `https://cakalele-production-ab1d.up.railway.app`
- **Wallet Sessions:** `0xe7d9532d086478c1e1cc6914e74929814118e4de35ffd8b9a326a0bd8ef91d11` (`signalvault`)
- **Contract (Sui Mainnet):** PACKAGE `0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f` — [detail](./smart-contract/deployments.mainnet.md)
- **Lisensi:** MIT _(atau sesuai pilihan)_
- **Kontak:** _(isi email / Discord)_

---

<div align="center">

**The Bitter Pundit — *The Receipt***
*Built on Walrus Mainnet · Powered by Walrus Memory (MemWal)*
🐋 #Walrus

</div>
