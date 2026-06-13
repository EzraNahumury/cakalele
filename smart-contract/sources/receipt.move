/// PredictionReceipt — jantung "anti-backdating".
///
/// Saat user commit prediksi, backend sudah menyimpan teks prediksi ke Walrus via MemWal dan
/// mendapat `blob_id`. `commit_prediction` meng-ANCHOR `blob_id` itu + timestamp `Clock` yang
/// TRUSTLESS (dari tx yang ditandatangani user) ke object Sui milik user. Inilah bukti bahwa
/// prediksi sudah ada SEBELUM kickoff dan tak bisa di-backdate.
///
/// Receipt di-SHARE supaya backend (OracleCap) bisa me-resolve-nya belakangan. Resolusi hanya
/// boleh lewat `oracle::resolve_prediction` → `resolve_internal` di sini (package-visibility),
/// dan saat resolve, id `MatchResult` yang dipakai DICATAT (`resolved_with`) agar verdict
/// terikat ke hasil resmi yang ter-record on-chain (auditable).
module pundit::receipt {
    use sui::event;
    use sui::clock::Clock;
    use pundit::profile::{Self, PunditProfile};

    // ── Status receipt (sekaligus nilai `verdict` saat resolve) ──
    const STATUS_PENDING: u8 = 0;
    const STATUS_CORRECT: u8 = 1;
    const STATUS_WRONG: u8 = 2;

    // ── Error codes ──
    const ENotOwner: u64 = 1;
    const EAlreadyResolved: u64 = 2;
    const EProfileMismatch: u64 = 3;
    const EInvalidVerdict: u64 = 4;
    const EInvalidConfidence: u64 = 5;
    const EEmptyMatchId: u64 = 6;
    const EEmptyBlobId: u64 = 7;

    /// SHARED object. Satu blob/receipt per prediksi (append-only — tak pernah di-overwrite).
    public struct PredictionReceipt has key {
        id: UID,
        owner: address,
        profile_id: ID,             // mengikat receipt ke PunditProfile pembuatnya
        match_id: vector<u8>,       // mis. b"ARG-FRA-2026-06-13"
        blob_id: vector<u8>,        // Walrus blob_id (anchor konten dari MemWal)
        confidence: u8,             // 0=low 1=med 2=high
        committed_at_ms: u64,       // dari Clock — TRUSTLESS, bukti pra-kickoff
        status: u8,                 // 0=Pending 1=Correct 2=Wrong
        resolved_with: Option<ID>,  // id MatchResult yang dipakai saat resolve (none = belum)
    }

    public struct PredictionCommitted has copy, drop {
        receipt_id: ID,
        owner: address,
        match_id: vector<u8>,
        blob_id: vector<u8>,
        committed_at_ms: u64,
    }

    public struct PredictionResolved has copy, drop {
        receipt_id: ID,
        match_id: vector<u8>,
        verdict: u8,
        match_result_id: ID,        // hasil resmi yang menjadi dasar verdict
        new_respect_score: u64,
        relationship_state: u8,
    }

    /// COMMIT — ditandatangani USER (bukan backend) agar timestamp & ownership benar-benar miliknya.
    public fun commit_prediction(
        profile: &mut PunditProfile,
        match_id: vector<u8>,
        blob_id: vector<u8>,
        confidence: u8,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        // profile SHARED → wajib cek pemanggil adalah pemiliknya
        assert!(profile::owner(profile) == ctx.sender(), ENotOwner);
        assert!(confidence <= 2, EInvalidConfidence);
        // anchor harus menunjuk sesuatu — tolak match_id / blob_id kosong
        assert!(match_id.length() > 0, EEmptyMatchId);
        assert!(blob_id.length() > 0, EEmptyBlobId);

        let now = clock.timestamp_ms();
        profile::record_commit(profile);

        let receipt = PredictionReceipt {
            id: object::new(ctx),
            owner: ctx.sender(),
            profile_id: object::id(profile),
            match_id,
            blob_id,
            confidence,
            committed_at_ms: now,
            status: STATUS_PENDING,
            resolved_with: option::none(),
        };

        event::emit(PredictionCommitted {
            receipt_id: object::id(&receipt),
            owner: receipt.owner,
            match_id: receipt.match_id,
            blob_id: receipt.blob_id,
            committed_at_ms: now,
        });

        transfer::share_object(receipt);
    }

    /// RESOLVE — hanya boleh dipanggil dari modul `oracle` (yang menggating dengan OracleCap dan
    /// mem-verifikasi bahwa `match_result_id` cocok dengan match_id receipt sebelum memanggil ini).
    /// `verdict` ∈ {STATUS_CORRECT, STATUS_WRONG}.
    public(package) fun resolve_internal(
        receipt: &mut PredictionReceipt,
        profile: &mut PunditProfile,
        verdict: u8,
        match_result_id: ID,
    ) {
        assert!(receipt.status == STATUS_PENDING, EAlreadyResolved);
        assert!(receipt.profile_id == object::id(profile), EProfileMismatch);
        assert!(verdict == STATUS_CORRECT || verdict == STATUS_WRONG, EInvalidVerdict);

        receipt.status = verdict;
        receipt.resolved_with = option::some(match_result_id);
        profile::apply_verdict(profile, verdict == STATUS_CORRECT);

        event::emit(PredictionResolved {
            receipt_id: object::id(receipt),
            match_id: receipt.match_id,
            verdict,
            match_result_id,
            new_respect_score: profile::respect_score(profile),
            relationship_state: profile::relationship_state(profile),
        });
    }

    // ── Read-only accessors ──
    public fun status(r: &PredictionReceipt): u8 { r.status }
    public fun owner(r: &PredictionReceipt): address { r.owner }
    public fun match_id(r: &PredictionReceipt): vector<u8> { r.match_id }
    public fun blob_id(r: &PredictionReceipt): vector<u8> { r.blob_id }
    public fun committed_at_ms(r: &PredictionReceipt): u64 { r.committed_at_ms }
    public fun confidence(r: &PredictionReceipt): u8 { r.confidence }
    public fun resolved_with(r: &PredictionReceipt): Option<ID> { r.resolved_with }

    // Konstanta status untuk dipakai modul lain / test
    public fun status_pending(): u8 { STATUS_PENDING }
    public fun status_correct(): u8 { STATUS_CORRECT }
    public fun status_wrong(): u8 { STATUS_WRONG }
}
