/// PunditProfile — identitas & state hubungan per-user yang verifiable on-chain.
///
/// Object ini SHARED (bukan owned) supaya dua pihak bisa mengaksesnya:
///   - user (saat `commit_prediction` di modul `receipt`)
///   - backend pemegang `OracleCap` (saat `resolve_prediction` di modul `oracle`)
///
/// Anti-Sybil: `ProfileRegistry` (shared, dibuat di `init`) memetakan address → profile id
/// sehingga SATU wallet hanya bisa punya SATU profil. Tanpa ini, user bisa mint profil baru
/// untuk mereset respect_score (lihat audit). Respect/state diturunkan dari akurasi historis dan
/// dihitung ulang setiap kali sebuah prediksi di-resolve. Semua logika di sini deterministik.
module pundit::profile {
    use sui::event;
    use sui::clock::Clock;
    use sui::table::{Self, Table};

    // ── Relationship states (selaras dengan Respect Arc di README §7) ──
    const STATE_SKEPTIS: u8 = 0; // Day 1 / data minim
    const STATE_RIVAL: u8 = 1;   // akurasi rendah
    const STATE_NAIK: u8 = 2;    // mulai membaik
    const STATE_RESPEK: u8 = 3;  // akurasi konsisten
    const STATE_ORACLE: u8 = 4;  // track record elite (insecure/begging)

    const DEFAULT_RESPECT: u64 = 50;
    const MIN_RESOLVED_FOR_STATE: u64 = 2; // butuh ≥2 hasil sebelum keluar dari Skeptis

    // ── Error codes ──
    const EProfileExists: u64 = 1; // wallet sudah punya profil

    /// Registry global (SHARED, dibuat sekali di `init`). Memetakan owner → profile id agar
    /// satu wallet = satu profil (anti farming respect score).
    public struct ProfileRegistry has key {
        id: UID,
        profiles: Table<address, ID>,
    }

    /// Object per-user. SHARED setelah dibuat.
    public struct PunditProfile has key {
        id: UID,
        owner: address,
        created_at_ms: u64,
        total_predictions: u64, // jumlah commit (termasuk yang masih Pending)
        correct: u64,
        wrong: u64,
        respect_score: u64,     // 0..100
        relationship_state: u8,
    }

    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        created_at_ms: u64,
    }

    /// Module initializer — jalan otomatis sekali saat publish. Share registry kosong.
    fun init(ctx: &mut TxContext) {
        transfer::share_object(ProfileRegistry {
            id: object::new(ctx),
            profiles: table::new(ctx),
        });
    }

    /// Buat profil — SATU per wallet (di-enforce on-chain via registry). Object di-share.
    public fun create_profile(registry: &mut ProfileRegistry, clock: &Clock, ctx: &mut TxContext) {
        let sender = ctx.sender();
        assert!(!table::contains(&registry.profiles, sender), EProfileExists);

        let now = clock.timestamp_ms();
        let profile = PunditProfile {
            id: object::new(ctx),
            owner: sender,
            created_at_ms: now,
            total_predictions: 0,
            correct: 0,
            wrong: 0,
            respect_score: DEFAULT_RESPECT,
            relationship_state: STATE_SKEPTIS,
        };
        let pid = object::id(&profile);
        table::add(&mut registry.profiles, sender, pid);
        event::emit(ProfileCreated {
            profile_id: pid,
            owner: sender,
            created_at_ms: now,
        });
        transfer::share_object(profile);
    }

    // ── Mutators yang hanya boleh dipanggil modul lain dalam package ──

    /// Dipanggil `receipt::commit_prediction` saat user commit prediksi baru.
    public(package) fun record_commit(profile: &mut PunditProfile) {
        profile.total_predictions = profile.total_predictions + 1;
    }

    /// Dipanggil saat sebuah prediksi di-resolve. `is_correct` = verdict.
    /// Menaikkan counter lalu menghitung ulang respect_score & relationship_state.
    public(package) fun apply_verdict(profile: &mut PunditProfile, is_correct: bool) {
        if (is_correct) {
            profile.correct = profile.correct + 1;
        } else {
            profile.wrong = profile.wrong + 1;
        };
        recompute(profile);
    }

    /// Respect = persentase akurasi (0..100). State dari threshold + gating volume.
    fun recompute(profile: &mut PunditProfile) {
        let resolved = profile.correct + profile.wrong;
        if (resolved == 0) {
            profile.respect_score = DEFAULT_RESPECT;
            profile.relationship_state = STATE_SKEPTIS;
            return
        };
        let respect = profile.correct * 100 / resolved;
        profile.respect_score = respect;
        profile.relationship_state = if (resolved < MIN_RESOLVED_FOR_STATE) {
            STATE_SKEPTIS
        } else if (respect < 35) {
            STATE_RIVAL
        } else if (respect < 55) {
            STATE_NAIK
        } else if (respect < 80) {
            STATE_RESPEK
        } else {
            STATE_ORACLE
        };
    }

    // ── Read-only accessors (untuk modul lain, test, & dibaca RPC oleh frontend) ──

    public fun owner(p: &PunditProfile): address { p.owner }
    public fun respect_score(p: &PunditProfile): u64 { p.respect_score }
    public fun relationship_state(p: &PunditProfile): u8 { p.relationship_state }
    public fun total_predictions(p: &PunditProfile): u64 { p.total_predictions }
    public fun correct(p: &PunditProfile): u64 { p.correct }
    public fun wrong(p: &PunditProfile): u64 { p.wrong }
    public fun has_profile(registry: &ProfileRegistry, who: address): bool {
        table::contains(&registry.profiles, who)
    }

    #[test_only]
    /// Jalankan `init` di test (share ProfileRegistry tanpa publish).
    public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }
}
