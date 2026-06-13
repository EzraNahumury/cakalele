/// Oracle — siapa yang berhak menetapkan hasil laga & me-resolve prediksi.
///
/// `OracleCap` dibuat sekali saat publish (di `init`) dan ditransfer ke publisher (backend).
/// Backend memegang cap ini untuk:
///   1. `record_result` — mencatat hasil resmi laga (anchor `result_blob_id` Walrus + timestamp).
///   2. `resolve_prediction` — menetapkan verdict (benar/salah) sebuah receipt.
///
/// HONEST NOTE: perbandingan teks "Argentina 3-0" vs skor riil dihitung OFF-CHAIN (agen/LLM +
/// data oracle hasil bola). On-chain hanya mencatat verdict yang auditable. Ini titik tepercaya
/// yang kami akui terang-terangan (README §17).
module pundit::oracle {
    use sui::event;
    use sui::clock::Clock;
    use pundit::profile::PunditProfile;
    use pundit::receipt::{Self, PredictionReceipt};

    /// Kapabilitas admin. `store` agar bisa ditransfer/dikelola.
    public struct OracleCap has key, store {
        id: UID,
    }

    /// Hasil resmi sebuah laga. SHARED & append-only (auditable).
    public struct MatchResult has key {
        id: UID,
        match_id: vector<u8>,
        result_blob_id: vector<u8>, // hasil resmi disimpan di Walrus juga
        recorded_at_ms: u64,
    }

    public struct ResultRecorded has copy, drop {
        match_result_id: ID,
        match_id: vector<u8>,
        result_blob_id: vector<u8>,
        recorded_at_ms: u64,
    }

    /// Dijalankan otomatis sekali saat package di-publish. Cap → publisher (backend).
    fun init(ctx: &mut TxContext) {
        transfer::transfer(OracleCap { id: object::new(ctx) }, ctx.sender());
    }

    /// Catat hasil resmi laga. Butuh OracleCap.
    public fun record_result(
        _cap: &OracleCap,
        match_id: vector<u8>,
        result_blob_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let now = clock.timestamp_ms();
        let result = MatchResult {
            id: object::new(ctx),
            match_id,
            result_blob_id,
            recorded_at_ms: now,
        };
        event::emit(ResultRecorded {
            match_result_id: object::id(&result),
            match_id: result.match_id,
            result_blob_id: result.result_blob_id,
            recorded_at_ms: now,
        });
        transfer::share_object(result);
    }

    /// Resolve sebuah prediksi. Butuh OracleCap. `verdict` ∈ {1=Correct, 2=Wrong}.
    public fun resolve_prediction(
        _cap: &OracleCap,
        profile: &mut PunditProfile,
        receipt: &mut PredictionReceipt,
        verdict: u8,
        _ctx: &mut TxContext,
    ) {
        receipt::resolve_internal(receipt, profile, verdict);
    }

    /// Transfer OracleCap (mis. rotasi kunci backend). Cap punya `store` → public_transfer.
    public fun transfer_cap(cap: OracleCap, to: address) {
        transfer::public_transfer(cap, to);
    }

    #[test_only]
    /// Buat OracleCap di test tanpa menjalankan `init`.
    public fun new_cap_for_testing(ctx: &mut TxContext): OracleCap {
        OracleCap { id: object::new(ctx) }
    }
}
