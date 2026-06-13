# Pundit — Smart Contract (Move on Sui)

Lapisan **trust anchor** on-chain untuk The Bitter Pundit. Memory teks tetap di Walrus (via
MemWal); contract ini hanya meng-anchor `blob_id` + timestamp `Clock` trustless, mencatat verdict
hasil laga yang auditable, dan menghitung Respect Score. Rasional lengkap: [insight.md](./insight.md).

## Modul

| Modul | Isi |
|---|---|
| [`profile`](./sources/profile.move) | `ProfileRegistry` (shared, anti-Sybil: 1 wallet = 1 profil) + `PunditProfile` (shared): respect_score, relationship_state, akurasi. `create_profile(registry, clock)`. |
| [`receipt`](./sources/receipt.move) | `PredictionReceipt` (shared): anchor `blob_id` + `committed_at_ms` + `resolved_with`. `commit_prediction` (ditandatangani user, tolak `match_id`/`blob_id` kosong). |
| [`oracle`](./sources/oracle.move) | `OracleCap` (operasional) + `OracleAdminCap` (recovery), `MatchResult`. `record_result`, `resolve_prediction` (gated cap, **wajib `&MatchResult` yang cocok**), `transfer_cap`, `mint_oracle_cap`. |

State machine relationship (dari `respect` = akurasi %):
`<2 resolved → Skeptis(0)` · `<35 → Rival(1)` · `<55 → Naik(2)` · `<80 → Respek(3)` · `≥80 → Oracle(4)`

## Prasyarat

Pasang Sui CLI (belum terpasang di mesin ini):

```bash
brew install sui          # macOS, atau
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui
sui --version
```

## Build & Test

```bash
cd smart-contract
sui move build
sui move test            # menjalankan tests/pundit_tests.move
```

## Publish ke Mainnet

```bash
sui client switch --env mainnet
sui client publish --gas-budget 200000000
```

Catat dari output:
- `PACKAGE_ID` (object package yang dipublish)
- `ProfileRegistry` shared object id (otomatis dibuat `profile::init`)
- `OracleCap` object id (otomatis dibuat `oracle::init`, ditransfer ke wallet publisher = backend)
- `OracleAdminCap` object id (recovery — simpan aman/offline; dipakai `mint_oracle_cap` kalau OracleCap hilang)

### ✅ Hasil deploy — Mainnet (14 Jun 2026)

Di-publish dari wallet Sessions `signalvault`
(`0xe7d9532d086478c1e1cc6914e74929814118e4de35ffd8b9a326a0bd8ef91d11`) pakai `sui 1.64.1`,
edition `2024.beta`. Build clean, **8/8 unit test PASS**, smoke test `create_profile` sukses.
Detail lengkap: [`deployments.mainnet.md`](./deployments.mainnet.md).

**Object IDs**

| Object | ID | Sifat |
|---|---|---|
| Package | `0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f` | immutable (`oracle`,`profile`,`receipt`) |
| ProfileRegistry | `0xc4f4dd4183f14ca23c8a795a39f84cc5177d45f3536e6b9acc586a3d1db6cf73` | Shared |
| OracleCap | `0x39e9dbc5cfbbb4c12534d2da14423a65aff2c336fcc24cc4941724770928f8f0` | Owned → signalvault (backend) |
| OracleAdminCap | `0xdc0e103eca282e1fb68f6e123f4c822ae5d062f7085d88d6c0737499c805e052` | Owned → signalvault (recovery) |
| UpgradeCap | `0xe84f4493e7c9f0414846a41659758034d225cd5aa5a7c242ac394fc943245fa6` | Owned → signalvault |

**Transaksi**

| Aksi | Digest | Gas (SUI) |
|---|---|---|
| Publish package | `2uqht4eUDLVVj1pgpTef59T4hLpJyE9jaWMgna3qWxZ1` | 0.04484 |
| Smoke test `create_profile` | `HgSKtfY2s3jp8pVCz9AkTvfFNBPinQWY7W3f8PmanChh` | ~0.005 |

Smoke test → `PunditProfile = 0x418b67920002bbbd727146b02a32b55fdfd1624d519d757220e59c59af5529d9`
+ event `ProfileCreated` (created_at_ms `1781380994686`); registry ter-mutate → anti-Sybil aktif live.

**Suiscan (mainnet)**

- Package: https://suiscan.xyz/mainnet/object/0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f
- Publish tx: https://suiscan.xyz/mainnet/tx/2uqht4eUDLVVj1pgpTef59T4hLpJyE9jaWMgna3qWxZ1
- ProfileCreated tx: https://suiscan.xyz/mainnet/tx/HgSKtfY2s3jp8pVCz9AkTvfFNBPinQWY7W3f8PmanChh

## Alur pemakaian on-chain

1. **Sekali per user** — user tanda tangan:
   `pundit::profile::create_profile(registry, clock=0x6)` → `PunditProfile` shared.
   (Abort `EProfileExists` kalau wallet sudah punya profil.)
2. **Tiap prediksi (pra-kickoff)** — backend simpan teks ke Walrus → dapat `blob_id` → user tanda tangan:
   `pundit::receipt::commit_prediction(profile, match_id, blob_id, confidence, clock=0x6)`.
   (`match_id` & `blob_id` tak boleh kosong.)
3. **Setelah hasil laga** — backend (OracleCap):
   `pundit::oracle::record_result(cap, match_id, result_blob_id, clock=0x6)` → dapat `MatchResult` shared, lalu
   `pundit::oracle::resolve_prediction(cap, profile, receipt, match_result, verdict)` — `verdict`: 1=Correct, 2=Wrong.
   Resolve **wajib** `match_result.match_id == receipt.match_id` (abort `EMatchMismatch`) dan
   `recorded_at_ms >= committed_at_ms` (abort `EResultBeforeCommit`); id MatchResult tercatat di `resolved_with`.

## Integrasi frontend (TS — @mysten/sui + dApp Kit)

```ts
import { Transaction } from "@mysten/sui/transactions";

const PKG = process.env.NEXT_PUBLIC_PUNDIT_PACKAGE_ID!;
const CLOCK = "0x6";

// COMMIT prediksi (ditandatangani user lewat wallet)
function commitPredictionTx(profileId: string, matchId: string, blobId: string, confidence: number) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PKG}::receipt::commit_prediction`,
    arguments: [
      tx.object(profileId),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(matchId))),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(blobId))),
      tx.pure.u8(confidence),
      tx.object(CLOCK),
    ],
  });
  return tx; // signAndExecuteTransaction(tx)
}
```

Backend `resolve_prediction` memakai `OracleCap` (Ed25519 keypair backend, bukan wallet user).

## Events (untuk dashboard before/after)

- `ProfileCreated { profile_id, owner, created_at_ms }`
- `PredictionCommitted { receipt_id, owner, match_id, blob_id, committed_at_ms }`
- `PredictionResolved { receipt_id, match_id, verdict, match_result_id, new_respect_score, relationship_state }`
- `ResultRecorded { match_result_id, match_id, result_blob_id, recorded_at_ms }`
- `OracleCapTransferred { to }` · `OracleCapMinted { to }` (audit kapabilitas)

Demo before/after: tampilkan dua event `PredictionCommitted` dengan `committed_at_ms` beda hari di Suiscan.

## Env yang dibutuhkan app

```
NEXT_PUBLIC_PUNDIT_PACKAGE_ID=0x...
NEXT_PUBLIC_PUNDIT_REGISTRY_ID=0x...   # shared ProfileRegistry
PUNDIT_ORACLE_CAP_ID=0x...             # operasional (backend)
PUNDIT_ORACLE_ADMIN_CAP_ID=0x...       # recovery (simpan offline)
SUI_NETWORK=mainnet
```

> **Catatan keamanan & limitasi:** `OracleCap` = titik tepercaya tunggal (verdict + respect).
> `mint_oracle_cap` (butuh `OracleAdminCap`) memungkinkan **recovery dari kehilangan** cap, tapi
> **tidak mencabut** cap lama yang bocor — keterbatasan yang kami akui. Simpan `OracleAdminCap`
> offline/terpisah dari backend.
