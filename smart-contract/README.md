# Pundit — Smart Contract (Move on Sui)

Lapisan **trust anchor** on-chain untuk The Bitter Pundit. Memory teks tetap di Walrus (via
MemWal); contract ini hanya meng-anchor `blob_id` + timestamp `Clock` trustless, mencatat verdict
hasil laga yang auditable, dan menghitung Respect Score. Rasional lengkap: [insight.md](./insight.md).

## Modul

| Modul | Isi |
|---|---|
| [`profile`](./sources/profile.move) | `PunditProfile` (shared): respect_score, relationship_state, akurasi. `create_profile`. |
| [`receipt`](./sources/receipt.move) | `PredictionReceipt` (shared): anchor `blob_id` + `committed_at_ms`. `commit_prediction` (ditandatangani user). |
| [`oracle`](./sources/oracle.move) | `OracleCap`, `MatchResult`. `record_result`, `resolve_prediction` (gated cap). |

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
- `OracleCap` object id (otomatis dibuat `init`, ditransfer ke wallet publisher = backend)

## Alur pemakaian on-chain

1. **Sekali per user** — user tanda tangan:
   `pundit::profile::create_profile(clock=0x6)` → `PunditProfile` shared.
2. **Tiap prediksi (pra-kickoff)** — backend simpan teks ke Walrus → dapat `blob_id` → user tanda tangan:
   `pundit::receipt::commit_prediction(profile, match_id, blob_id, confidence, clock=0x6)`.
3. **Setelah hasil laga** — backend (OracleCap):
   `pundit::oracle::record_result(cap, match_id, result_blob_id, clock=0x6)` lalu
   `pundit::oracle::resolve_prediction(cap, profile, receipt, verdict)` — `verdict`: 1=Correct, 2=Wrong.

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
- `PredictionResolved { receipt_id, match_id, verdict, new_respect_score, relationship_state }`
- `ResultRecorded { match_result_id, match_id, result_blob_id, recorded_at_ms }`

Demo before/after: tampilkan dua event `PredictionCommitted` dengan `committed_at_ms` beda hari di Suiscan.

## Env yang dibutuhkan app

```
NEXT_PUBLIC_PUNDIT_PACKAGE_ID=0x...
PUNDIT_ORACLE_CAP_ID=0x...
SUI_NETWORK=mainnet
```
