# Deployment — `pundit` (Sui Mainnet)

> Sumber kebenaran ID on-chain. Di-publish 14 Jun 2026 dari wallet Sessions `signalvault`.
> CLI `sui 1.64.1`. Edition `2024.beta`. Build clean, 8/8 unit test PASS sebelum publish.

## Wallet Sessions (publisher / backend)

```
signalvault = 0xe7d9532d086478c1e1cc6914e74929814118e4de35ffd8b9a326a0bd8ef91d11
```
Memegang: `OracleCap`, `OracleAdminCap`, `UpgradeCap`. Saat publish berisi WAL + SUI + USDC.

## Object IDs

| Object | ID | Sifat |
|---|---|---|
| **Package** | `0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f` | immutable (modul: `oracle`, `profile`, `receipt`) |
| **ProfileRegistry** | `0xc4f4dd4183f14ca23c8a795a39f84cc5177d45f3536e6b9acc586a3d1db6cf73` | Shared (init_shared_version 874309676) |
| **OracleCap** | `0x39e9dbc5cfbbb4c12534d2da14423a65aff2c336fcc24cc4941724770928f8f0` | Owned → signalvault (operasional) |
| **OracleAdminCap** | `0xdc0e103eca282e1fb68f6e123f4c822ae5d062f7085d88d6c0737499c805e052` | Owned → signalvault (recovery, simpan offline) |
| **UpgradeCap** | `0xe84f4493e7c9f0414846a41659758034d225cd5aa5a7c242ac394fc943245fa6` | Owned → signalvault |

## Transaksi

| Aksi | Digest | Gas (SUI) |
|---|---|---|
| Publish package | `2uqht4eUDLVVj1pgpTef59T4hLpJyE9jaWMgna3qWxZ1` | 0.04484 |
| Smoke test `create_profile` | `HgSKtfY2s3jp8pVCz9AkTvfFNBPinQWY7W3f8PmanChh` | ~0.005 |

Smoke test menghasilkan `PunditProfile = 0x418b67920002bbbd727146b02a32b55fdfd1624d519d757220e59c59af5529d9`
(owner signalvault) + event `ProfileCreated` (created_at_ms `1781380994686`). Registry ter-mutate
→ anti-Sybil aktif live (`create_profile` kedua dari wallet sama akan abort `EProfileExists`).

## Suiscan (mainnet)

- Package: https://suiscan.xyz/mainnet/object/0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f
- Publish tx: https://suiscan.xyz/mainnet/tx/2uqht4eUDLVVj1pgpTef59T4hLpJyE9jaWMgna3qWxZ1
- ProfileCreated tx: https://suiscan.xyz/mainnet/tx/HgSKtfY2s3jp8pVCz9AkTvfFNBPinQWY7W3f8PmanChh

## Env untuk app (`.env`)

```
NEXT_PUBLIC_PUNDIT_PACKAGE_ID=0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f
NEXT_PUBLIC_PUNDIT_REGISTRY_ID=0xc4f4dd4183f14ca23c8a795a39f84cc5177d45f3536e6b9acc586a3d1db6cf73
PUNDIT_ORACLE_CAP_ID=0x39e9dbc5cfbbb4c12534d2da14423a65aff2c336fcc24cc4941724770928f8f0
PUNDIT_ORACLE_ADMIN_CAP_ID=0xdc0e103eca282e1fb68f6e123f4c822ae5d062f7085d88d6c0737499c805e052
SUI_NETWORK=mainnet
```
