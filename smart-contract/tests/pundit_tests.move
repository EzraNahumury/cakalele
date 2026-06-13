#[test_only]
module pundit::pundit_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use std::unit_test::destroy;
    use sui::clock::{Self, Clock};
    use pundit::profile::{Self, PunditProfile, ProfileRegistry};
    use pundit::receipt::{Self, PredictionReceipt};
    use pundit::oracle;

    const USER: address = @0xA11CE;
    const BACKEND: address = @0xB0B;

    fun new_clock(scn: &mut Scenario): Clock {
        clock::create_for_testing(ts::ctx(scn))
    }

    /// Share registry (init) lalu buat profil untuk `who`. Tinggalkan scenario di tx baru.
    fun setup_profile(scn: &mut Scenario, clock: &Clock, who: address) {
        profile::init_for_testing(ts::ctx(scn));
        ts::next_tx(scn, who);
        {
            let mut reg = ts::take_shared<ProfileRegistry>(scn);
            profile::create_profile(&mut reg, clock, ts::ctx(scn));
            ts::return_shared(reg);
        };
        ts::next_tx(scn, who);
    }

    #[test]
    fun test_commit_then_resolve_correct_updates_respect() {
        let mut scn = ts::begin(USER);
        let clock = new_clock(&mut scn);
        setup_profile(&mut scn, &clock, USER);

        // USER commit prediksi
        {
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            assert!(profile::respect_score(&prof) == 50, 0);
            assert!(profile::relationship_state(&prof) == 0, 1); // Skeptis
            receipt::commit_prediction(
                &mut prof,
                b"ARG-FRA-2026-06-13",
                b"walrus-blob-id-xyz",
                2, // high confidence
                &clock,
                ts::ctx(&mut scn),
            );
            assert!(profile::total_predictions(&prof) == 1, 2);
            ts::return_shared(prof);
        };

        // BACKEND pegang OracleCap → resolve = Correct (terikat ke MatchResult yang cocok)
        ts::next_tx(&mut scn, BACKEND);
        {
            let cap = oracle::new_cap_for_testing(ts::ctx(&mut scn));
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            let mut rcpt = ts::take_shared<PredictionReceipt>(&scn);
            let result = oracle::new_match_result_for_testing(b"ARG-FRA-2026-06-13", ts::ctx(&mut scn));

            assert!(receipt::status(&rcpt) == receipt::status_pending(), 3);
            oracle::resolve_prediction(&cap, &mut prof, &mut rcpt, &result, receipt::status_correct(), ts::ctx(&mut scn));

            assert!(receipt::status(&rcpt) == receipt::status_correct(), 4);
            assert!(profile::correct(&prof) == 1, 5);
            assert!(profile::respect_score(&prof) == 100, 6); // 1/1 = 100%
            assert!(profile::relationship_state(&prof) == 0, 7); // resolved 1 < 2 → masih Skeptis
            assert!(receipt::resolved_with(&rcpt).is_some(), 8); // verdict terikat ke MatchResult

            ts::return_shared(prof);
            ts::return_shared(rcpt);
            destroy(cap);
            destroy(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scn);
    }

    #[test]
    fun test_two_wrong_makes_rival() {
        let mut scn = ts::begin(USER);
        let clock = new_clock(&mut scn);
        setup_profile(&mut scn, &clock, USER);

        // commit prediksi #1
        {
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            receipt::commit_prediction(&mut prof, b"M1", b"b1", 1, &clock, ts::ctx(&mut scn));
            ts::return_shared(prof);
        };
        ts::next_tx(&mut scn, USER);
        let id1 = option::destroy_some(ts::most_recent_id_shared<PredictionReceipt>());

        // commit prediksi #2
        {
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            receipt::commit_prediction(&mut prof, b"M2", b"b2", 1, &clock, ts::ctx(&mut scn));
            ts::return_shared(prof);
        };
        ts::next_tx(&mut scn, USER);
        let id2 = option::destroy_some(ts::most_recent_id_shared<PredictionReceipt>());

        // resolve keduanya = Wrong (tiap receipt dgn MatchResult yang cocok)
        ts::next_tx(&mut scn, BACKEND);
        {
            let cap = oracle::new_cap_for_testing(ts::ctx(&mut scn));
            let mut prof = ts::take_shared<PunditProfile>(&scn);

            let mut r1 = ts::take_shared_by_id<PredictionReceipt>(&scn, id1);
            let res1 = oracle::new_match_result_for_testing(b"M1", ts::ctx(&mut scn));
            oracle::resolve_prediction(&cap, &mut prof, &mut r1, &res1, receipt::status_wrong(), ts::ctx(&mut scn));
            ts::return_shared(r1);
            destroy(res1);

            let mut r2 = ts::take_shared_by_id<PredictionReceipt>(&scn, id2);
            let res2 = oracle::new_match_result_for_testing(b"M2", ts::ctx(&mut scn));
            oracle::resolve_prediction(&cap, &mut prof, &mut r2, &res2, receipt::status_wrong(), ts::ctx(&mut scn));
            ts::return_shared(r2);
            destroy(res2);

            assert!(profile::wrong(&prof) == 2, 0);
            assert!(profile::respect_score(&prof) == 0, 1);      // 0/2
            assert!(profile::relationship_state(&prof) == 1, 2); // Rival

            ts::return_shared(prof);
            destroy(cap);
        };

        clock::destroy_for_testing(clock);
        ts::end(scn);
    }

    #[test]
    #[expected_failure(abort_code = pundit::receipt::ENotOwner)]
    fun test_non_owner_cannot_commit() {
        let mut scn = ts::begin(USER);
        let clock = new_clock(&mut scn);
        setup_profile(&mut scn, &clock, USER);

        // BACKEND (bukan owner) coba commit ke profil USER → abort ENotOwner
        ts::next_tx(&mut scn, BACKEND);
        {
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            receipt::commit_prediction(&mut prof, b"M1", b"b1", 0, &clock, ts::ctx(&mut scn));
            ts::return_shared(prof);
        };

        clock::destroy_for_testing(clock);
        ts::end(scn);
    }

    #[test]
    #[expected_failure(abort_code = pundit::profile::EProfileExists)]
    fun test_duplicate_profile_aborts() {
        let mut scn = ts::begin(USER);
        let clock = new_clock(&mut scn);
        setup_profile(&mut scn, &clock, USER); // profil pertama

        // wallet sama coba buat profil kedua → abort EProfileExists
        {
            let mut reg = ts::take_shared<ProfileRegistry>(&scn);
            profile::create_profile(&mut reg, &clock, ts::ctx(&mut scn));
            ts::return_shared(reg);
        };

        clock::destroy_for_testing(clock);
        ts::end(scn);
    }

    #[test]
    #[expected_failure(abort_code = pundit::receipt::EEmptyBlobId)]
    fun test_empty_blob_aborts() {
        let mut scn = ts::begin(USER);
        let clock = new_clock(&mut scn);
        setup_profile(&mut scn, &clock, USER);

        {
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            receipt::commit_prediction(&mut prof, b"M1", b"", 0, &clock, ts::ctx(&mut scn)); // blob kosong → abort
            ts::return_shared(prof);
        };

        clock::destroy_for_testing(clock);
        ts::end(scn);
    }

    #[test]
    #[expected_failure(abort_code = pundit::oracle::EMatchMismatch)]
    fun test_resolve_requires_matching_result() {
        let mut scn = ts::begin(USER);
        let clock = new_clock(&mut scn);
        setup_profile(&mut scn, &clock, USER);

        {
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            receipt::commit_prediction(&mut prof, b"M1", b"b1", 0, &clock, ts::ctx(&mut scn));
            ts::return_shared(prof);
        };

        ts::next_tx(&mut scn, BACKEND);
        {
            let cap = oracle::new_cap_for_testing(ts::ctx(&mut scn));
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            let mut rcpt = ts::take_shared<PredictionReceipt>(&scn);
            let result = oracle::new_match_result_for_testing(b"WRONG-MATCH", ts::ctx(&mut scn)); // match_id beda
            oracle::resolve_prediction(&cap, &mut prof, &mut rcpt, &result, receipt::status_correct(), ts::ctx(&mut scn)); // abort

            ts::return_shared(prof);
            ts::return_shared(rcpt);
            destroy(cap);
            destroy(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scn);
    }

    #[test]
    #[expected_failure(abort_code = pundit::receipt::EAlreadyResolved)]
    fun test_cannot_double_resolve() {
        let mut scn = ts::begin(USER);
        let clock = new_clock(&mut scn);
        setup_profile(&mut scn, &clock, USER);

        {
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            receipt::commit_prediction(&mut prof, b"M1", b"b1", 0, &clock, ts::ctx(&mut scn));
            ts::return_shared(prof);
        };

        ts::next_tx(&mut scn, BACKEND);
        {
            let cap = oracle::new_cap_for_testing(ts::ctx(&mut scn));
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            let mut rcpt = ts::take_shared<PredictionReceipt>(&scn);
            let result = oracle::new_match_result_for_testing(b"M1", ts::ctx(&mut scn));

            oracle::resolve_prediction(&cap, &mut prof, &mut rcpt, &result, receipt::status_correct(), ts::ctx(&mut scn)); // ok
            oracle::resolve_prediction(&cap, &mut prof, &mut rcpt, &result, receipt::status_wrong(), ts::ctx(&mut scn));   // abort EAlreadyResolved

            ts::return_shared(prof);
            ts::return_shared(rcpt);
            destroy(cap);
            destroy(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scn);
    }

    #[test]
    #[expected_failure(abort_code = pundit::oracle::EZeroAddress)]
    fun test_transfer_cap_rejects_zero_address() {
        let mut scn = ts::begin(BACKEND);
        let cap = oracle::new_cap_for_testing(ts::ctx(&mut scn));
        oracle::transfer_cap(cap, @0x0); // abort EZeroAddress
        ts::end(scn);
    }
}
