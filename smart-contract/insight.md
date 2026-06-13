# Smart Contract Planning — The Bitter Pundit (*The Receipt*)

> Dokumen perencanaan **sebelum eksekusi**. Tujuan: menetapkan lapisan Move on-chain (Sui) apa
> yang perlu dibangun, kenapa, dan batas scope MVP-nya. Bahasa: Move on Sui Mainnet.

> **UPDATE pasca-audit (14 Jun 2026):** implementasi sudah maju melebihi sketsa di bawah —
> tanda tangan beberapa fungsi berubah. Lihat [README.md](./README.md) sebagai sumber kebenaran.
> Hardening yang sudah masuk: **(1)** `ProfileRegistry` shared (anti-Sybil, 1 wallet = 1 profil) →
> `create_profile(registry, clock)`; **(2)** `resolve_prediction` wajib `&MatchResult` yang cocok
> (`match_id` sama, `recorded_at_ms >= committed_at_ms`) + catat `resolved_with`; **(3)** `OracleAdminCap`
> + `mint_oracle_cap` (recovery), `transfer_cap` tolak `@0x0` + emit event; **(4)** `commit_prediction`
> tolak `match_id`/`blob_id` kosong. Tetap **belum** di-`sui move build`/`test`/publish (CLI belum terpasang).

---

## 0. Pertanyaan kunci dulu: apakah kita BUTUH smart contract custom?

Memory inti (prediksi, opini, recall semantik) **sudah** ditangani **MemWal SDK** — ia otomatis
menulis blob Walrus immutable + pointer Sui. Jadi kita **tidak** menulis ulang storage memory.

Yang **tidak** diberikan MemWal, dan jadi alasan kita butuh Move contract sendiri:

| Kebutuhan | Diberikan MemWal? | Diberikan Move contract custom? |
|---|---|---|
| Simpan & recall memory episodik | ✅ | — (jangan duplikat) |
| **Timestamp yang trustless** (bukti pra-kickoff) | 🟡 timestamp dari relayer (semi-tepercaya) | ✅ `Clock` Sui di dalam tx yang ditandatangani user |
| **Ownership receipt** yang user-owned & verifiable | 🟡 pointer dikelola relayer | ✅ object Sui milik wallet user |
| **Resolusi hasil** (benar/salah) yang auditable | ❌ | ✅ dicatat oleh OracleCap, on-chain |
| **Respect Score** sebagai state on-chain yang bisa dicek juri | ❌ (state turunan di backend) | ✅ object on-chain, opsional |

**Kesimpulan:** ya, kita bangun lapisan tipis Move sebagai **"trust anchor"** di atas MemWal.
Nilai jualnya untuk juri (kriteria *Memory Depth & Authenticity* + *Technical Execution*):
**commit prediksi → timestamp Sui-`Clock` trustless → anchor `blob_id` Walrus → resolusi
auditable**. Inilah yang membuat "Receipt tak terbantahkan" jadi klaim teknis nyata, bukan
sekadar baris database.

> Prinsip desain: **on-chain seminimal mungkin, tapi cukup untuk membuktikan klaim inti.**
> Perbandingan teks prediksi vs hasil laga (LLM/oracle) tetap **off-chain**; on-chain hanya
> menyimpan verdict + anchor + timestamp.

---

## 1. Arsitektur lapisan on-chain

```
User wallet ──commit──> [Move: pundit::receipt] ──record blob_id + Clock ts──> Sui
                                   │
MemWal SDK ──write blob──> Walrus (immutable, content-addressed)
                                   │
Backend (OracleCap) ──resolve──> [Move: pundit::oracle] ──verdict──> update receipt
                                   │
                          [Move: pundit::profile] ──> respect_score + relationship_state (opsional)
```

Alur waktu:
1. **COMMIT (pra-kickoff):** backend simpan prediksi ke Walrus via MemWal → dapat `blob_id` →
   user tanda tangan tx `commit_prediction(profile, match_id, blob_id, confidence, &clock)` →
   on-chain tercatat `committed_at_ms` dari `Clock` (tak bisa di-backdate).
2. **MATCH:** laga berlangsung.
3. **REVEAL/RESOLVE (pasca-hasil):** backend (pemegang `OracleCap`) catat hasil resmi laga,
   lalu panggil `resolve_prediction(receipt, verdict)` → status receipt jadi `Correct`/`Wrong`
   + update Respect Score.

---

## 2. Modul yang perlu dibuat

### MVP (wajib — 3 modul)

#### `pundit::profile`
Object per-user, sebagai identitas & state hubungan yang verifiable.
```move
public struct PunditProfile has key {
    id: UID,
    owner: address,
    created_at_ms: u64,
    total_predictions: u64,
    correct: u64,
    wrong: u64,
    respect_score: u64,          // 0..100, default mis. 50
    relationship_state: u8,      // 0=Skeptis 1=Rival 2=Naik 3=Respek 4=Oracle/Insecure
}
```
Entry:
- `create_profile(clock, ctx)` — sekali per wallet, transfer ke pengirim.
- (internal) `bump_stats(...)` dipanggil saat resolve.

#### `pundit::receipt`
Receipt prediksi — jantung "anti-backdating".
```move
public struct PredictionReceipt has key {
    id: UID,
    owner: address,
    match_id: vector<u8>,        // mis. "ARG-FRA-2026-06-13"
    blob_id: vector<u8>,         // Walrus blob_id dari MemWal (anchor konten)
    confidence: u8,              // 0=low 1=med 2=high
    committed_at_ms: u64,        // dari Clock — TRUSTLESS timestamp
    status: u8,                  // 0=Pending 1=Correct 2=Wrong
}
```
Entry:
- `commit_prediction(profile: &mut PunditProfile, match_id, blob_id, confidence, clock: &Clock, ctx)`
  → buat receipt, emit event, naikkan `total_predictions`.
- Emit `PredictionCommitted { receipt_id, owner, match_id, blob_id, committed_at_ms }`
  agar frontend/dashboard & juri bisa index via event.

#### `pundit::oracle`
Resolusi hasil — siapa boleh menetapkan benar/salah.
```move
public struct OracleCap has key, store { id: UID }   // dipegang backend/admin

public struct MatchResult has key {
    id: UID,
    match_id: vector<u8>,
    result_blob_id: vector<u8>,  // hasil resmi disimpan di Walrus juga (auditable)
    recorded_at_ms: u64,
}
```
Entry:
- `record_result(cap: &OracleCap, match_id, result_blob_id, clock, ctx)`.
- `resolve_prediction(cap: &OracleCap, profile: &mut PunditProfile, receipt: &mut PredictionReceipt, verdict: u8, clock)`
  → set `status`, update `correct/wrong`, hitung ulang `respect_score` + `relationship_state`.
  → emit `PredictionResolved { receipt_id, verdict, new_respect_score }`.

> **Honest note:** verdict (benar/salah) ditentukan off-chain oleh agen/oracle hasil laga, lalu
> dicatat on-chain oleh pemegang `OracleCap`. Ini keputusan sadar: membandingkan teks bebas
> "Argentina menang 3-0" vs skor riil bukan pekerjaan Move. On-chain = anchor + timestamp +
> verdict yang auditable, bukan mesin penilai.

### Stretch (nice-to-have, kalau waktu cukup)

- **`pundit::commit_reveal` (hash-based):** untuk prediksi yang harus **disembunyikan** sampai
  kickoff. Commit `sha256(plaintext || salt)`; reveal setelah laga & contract verifikasi hash.
  Memperkuat anti-backdating ke level kriptografis (lawan tuduhan "blob_id baru dibuat setelah
  tahu hasil"). MVP cukup anchor `blob_id` + `Clock`; ini upgrade kalau sempat.
- **Respect Score on-chain history:** simpan snapshot skor tiap matchday sebagai object terpisah
  (append-only) → grafik Respect di dashboard bisa di-trace 100% on-chain.
- **Display/`init` + `Publisher`:** Sui Object Display untuk receipt agar tampil rapi di wallet/explorer.

---

## 3. Yang TIDAK kita bangun (hindari over-engineering & jebakan juri)

- ❌ **Menyimpan teks memory di Move.** Itu tugas Walrus/MemWal. Move hanya simpan `blob_id`.
- ❌ **Token/NFT marketplace, staking, dsb.** Di luar scope; mengaburkan cerita memory.
- ❌ **Overwrite state.** Semua append-only / object baru, konsisten dgn filosofi Walrus.
- ❌ **On-chain LLM/penilaian teks.** Tetap off-chain.

---

## 4. Event yang harus di-emit (untuk dashboard & before/after)

Frontend dashboard membaca event ini untuk timeline & grafik (kriteria "interface publik"):
- `PredictionCommitted { receipt_id, owner, match_id, blob_id, committed_at_ms }`
- `PredictionResolved { receipt_id, verdict, new_respect_score, relationship_state }`
- `ResultRecorded { match_id, result_blob_id, recorded_at_ms }`

Before/after demo: tunjukkan **dua event `PredictionCommitted` dengan `committed_at_ms` berbeda
hari** di explorer (Suiscan) → bukti genuine Day 1 vs Day 4.

---

## 5. Integrasi dengan frontend & backend

- **Frontend** (`frontend/`, Next.js — belum ada Sui dApp Kit): tambah
  `@mysten/dapp-kit` + `@mysten/sui` untuk wallet connect & sign `commit_prediction`.
  (Catatan: `commit` ditandatangani **user** agar timestamp & ownership benar-benar miliknya.)
- **Backend orchestrator:** memegang `OracleCap`, menulis hasil laga ke Walrus, memanggil
  `record_result` + `resolve_prediction`. Juga yang memanggil MemWal `remember/recall`.
- **Env yang dibutuhkan:** `PACKAGE_ID`, `ORACLE_CAP_ID`, `SUI_NETWORK=mainnet`,
  shared/owned object IDs.

---

## 6. Rencana eksekusi (urutan build)

1. [x] `Move.toml` (rev framework mainnet) + struktur `sources/` & `tests/`.
2. [x] Modul `profile` — `create_profile`, `record_commit`, `apply_verdict`, respect/state recompute.
3. [x] Modul `receipt` — `commit_prediction` + event + `resolve_internal`.
4. [x] Modul `oracle` — `OracleCap`, `record_result`, `resolve_prediction`, `init`.
5. [x] Tests `tests/pundit_tests.move` (commit→resolve correct, dua wrong→Rival, non-owner abort,
   + pasca-audit: duplicate-profile, empty-blob, match-mismatch, double-resolve, transfer-cap @0x0).
5b. [x] Hardening keamanan pasca-audit: registry anti-Sybil, MatchResult binding di resolve,
   OracleAdminCap recovery + transfer_cap guard, validasi anchor non-kosong (lihat UPDATE di atas).
6. [ ] Pasang Sui CLI → `sui move build` && `sui move test` (CLI belum terpasang di mesin ini).
7. [ ] **Publish ke Mainnet** → catat `PACKAGE_ID`, `OracleCap` ID.
8. [ ] Smoke test: commit 1 prediksi dari CLI/script → cek event & object di Suiscan.
9. [ ] Wire ke frontend (dApp Kit) + backend (OracleCap). Lihat README.md.
10. [ ] (Stretch) hash commit-reveal & snapshot respect history.

**Definition of done MVP:** dari wallet mainnet bisa `commit_prediction` (timestamp `Clock`
tercatat, `blob_id` ter-anchor), lalu `resolve_prediction` mengubah status + respect_score, dan
semua terlihat sebagai event/object di Suiscan.

---

## 7. Risiko & catatan teknis

- **Biaya:** tiap commit = 1 tx gas SUI (kecil). Walrus storage (WAL) ditangani MemWal. Pastikan
  wallet Sessions terisi WAL + SUI.
- **`Clock` shared object:** `commit_prediction` butuh `&Clock` (id `0x6`) → tx jadi sedikit lebih
  mahal & tidak bisa sponsor-less di beberapa setup; aman untuk MVP.
- **Sentralisasi oracle:** `OracleCap` dipegang backend → titik tepercaya. Jujur akui di README
  (sudah selaras dgn §17 "Kejujuran Teknis"). Untuk verifiability, simpan `result_blob_id` Walrus.
- **Decoupling:** kalau MemWal sudah memberi pointer Sui yang cukup, validasi apakah lapisan
  `receipt` masih perlu — tapi `Clock` trustless + ownership user + verdict auditable adalah nilai
  tambah yang MemWal **tidak** beri, jadi tetap layak.

---

*Status: PLANNING — belum eksekusi. Verifikasi nama API MemWal & versi Sui framework saat mulai coding.*
