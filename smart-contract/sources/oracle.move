/// Oracle — siapa yang berhak menetapkan hasil laga & me-resolve prediksi.
///
/// Saat publish (`init`), DUA cap dibuat & ditransfer ke publisher (backend):
///   - `OracleCap`       — dipakai operasional: `record_result` + `resolve_prediction`.
///   - `OracleAdminCap`  — recovery: mint `OracleCap` baru kalau yang lama hilang.
///
/// Resolusi sekarang TERIKAT ke hasil resmi: `resolve_prediction` wajib menerima `&MatchResult`
/// yang match_id-nya sama dengan match_id receipt, dan id MatchResult itu dicatat di receipt +
/// event. `record_result` tak lagi "dekoratif" — outputnya jadi syarat resolve.
///
/// HONEST NOTE: perbandingan teks "Argentina 3-0" vs skor riil tetap OFF-CHAIN. On-chain mencatat
/// verdict + anchor hasil yang auditable. OracleCap = titik tepercaya (README §17). Cap bisa
/// di-mint ulang via admin (recovery dari kehilangan) tapi cap lama TIDAK otomatis dicabut —
/// keterbatasan yang kami akui.
module pundit::oracle {
    use sui::event;
    use sui::clock::Clock;
    use pundit::profile::PunditProfile;
    use pundit::receipt::{Self, PredictionReceipt};

    // ── Error codes ──
    const EMatchMismatch: u64 = 1;     // MatchResult.match_id != receipt.match_id
    const EResultBeforeCommit: u64 = 2; // hasil di-record sebelum prediksi di-commit
    const EZeroAddress: u64 = 3;       // transfer/mint ke @0x0
    const EEmptyMatchId: u64 = 4;      // match_id hasil kosong

    /// Kapabilitas operasional. `store` agar bisa ditransfer/dikelola.
    public struct OracleCap has key, store {
        id: UID,
    }

    /// Kapabilitas admin (recovery). Hanya untuk mint OracleCap pengganti.
    public struct OracleAdminCap has key, store {
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

    public struct OracleCapTransferred has copy, drop { to: address }
    public struct OracleCapMinted has copy, drop { to: address }

    /// Dijalankan otomatis sekali saat package di-publish. Cap → publisher (backend).
    fun init(ctx: &mut TxContext) {
        let publisher = ctx.sender();
        transfer::transfer(OracleCap { id: object::new(ctx) }, publisher);
        transfer::transfer(OracleAdminCap { id: object::new(ctx) }, publisher);
    }

    /// Catat hasil resmi laga. Butuh OracleCap.
    public fun record_result(
        _cap: &OracleCap,
        match_id: vector<u8>,
        result_blob_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(match_id.length() > 0, EEmptyMatchId);
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

    /// Resolve sebuah prediksi. Butuh OracleCap + `MatchResult` yang cocok dgn receipt.
    /// `verdict` ∈ {1=Correct, 2=Wrong}.
    public fun resolve_prediction(
        _cap: &OracleCap,
        profile: &mut PunditProfile,
        receipt: &mut PredictionReceipt,
        result: &MatchResult,
        verdict: u8,
        _ctx: &mut TxContext,
    ) {
        // verdict harus diikat ke hasil resmi laga yang BENAR
        assert!(result.match_id == receipt::match_id(receipt), EMatchMismatch);
        // hasil tak boleh "tercatat sebelum" prediksi dibuat (anti-backdating hasil)
        assert!(result.recorded_at_ms >= receipt::committed_at_ms(receipt), EResultBeforeCommit);
        receipt::resolve_internal(receipt, profile, verdict, object::id(result));
    }

    /// Transfer OracleCap (rotasi kunci backend). Validasi tujuan + emit event audit.
    public fun transfer_cap(cap: OracleCap, to: address) {
        assert!(to != @0x0, EZeroAddress);
        transfer::public_transfer(cap, to);
        event::emit(OracleCapTransferred { to });
    }

    /// Recovery — mint OracleCap baru kalau cap operasional hilang. Butuh OracleAdminCap.
    public fun mint_oracle_cap(_admin: &OracleAdminCap, to: address, ctx: &mut TxContext) {
        assert!(to != @0x0, EZeroAddress);
        transfer::public_transfer(OracleCap { id: object::new(ctx) }, to);
        event::emit(OracleCapMinted { to });
    }

    // ── Read-only accessors ──
    public fun match_result_match_id(r: &MatchResult): vector<u8> { r.match_id }
    public fun result_blob_id(r: &MatchResult): vector<u8> { r.result_blob_id }
    public fun recorded_at_ms(r: &MatchResult): u64 { r.recorded_at_ms }

    #[test_only]
    /// Buat OracleCap di test tanpa menjalankan `init`.
    public fun new_cap_for_testing(ctx: &mut TxContext): OracleCap {
        OracleCap { id: object::new(ctx) }
    }

    #[test_only]
    /// Buat OracleAdminCap di test.
    public fun new_admin_cap_for_testing(ctx: &mut TxContext): OracleAdminCap {
        OracleAdminCap { id: object::new(ctx) }
    }

    #[test_only]
    /// Buat MatchResult lokal di test (recorded_at_ms = 0).
    public fun new_match_result_for_testing(match_id: vector<u8>, ctx: &mut TxContext): MatchResult {
        MatchResult { id: object::new(ctx), match_id, result_blob_id: b"result-blob", recorded_at_ms: 0 }
    }
}
