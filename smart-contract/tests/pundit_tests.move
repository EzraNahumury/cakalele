#[test_only]
module pundit::pundit_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use std::unit_test::destroy;
    use sui::clock::{Self, Clock};
    use pundit::profile::{Self, PunditProfile};
    use pundit::receipt::{Self, PredictionReceipt};
    use pundit::oracle::{Self, OracleCap};

    const USER: address = @0xA11CE;
    const BACKEND: address = @0xB0B;

    fun new_clock(scn: &mut Scenario): Clock {
        clock::create_for_testing(ts::ctx(scn))
    }

    #[test]
    fun test_commit_then_resolve_correct_updates_respect() {
        let mut scn = ts::begin(USER);
        let clock = new_clock(&mut scn);

        // USER buat profil
        profile::create_profile(&clock, ts::ctx(&mut scn));
        ts::next_tx(&mut scn, USER);

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

        // BACKEND pegang OracleCap → resolve = Correct
        ts::next_tx(&mut scn, BACKEND);
        {
            let cap = oracle::new_cap_for_testing(ts::ctx(&mut scn));
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            let mut rcpt = ts::take_shared<PredictionReceipt>(&scn);

            assert!(receipt::status(&rcpt) == receipt::status_pending(), 3);
            oracle::resolve_prediction(&cap, &mut prof, &mut rcpt, receipt::status_correct(), ts::ctx(&mut scn));

            assert!(receipt::status(&rcpt) == receipt::status_correct(), 4);
            assert!(profile::correct(&prof) == 1, 5);
            assert!(profile::respect_score(&prof) == 100, 6); // 1/1 = 100%
            // resolved == 1 < MIN_RESOLVED_FOR_STATE(2) → masih Skeptis
            assert!(profile::relationship_state(&prof) == 0, 7);

            ts::return_shared(prof);
            ts::return_shared(rcpt);
            destroy(cap);
        };

        clock::destroy_for_testing(clock);
        ts::end(scn);
    }

    #[test]
    fun test_two_wrong_makes_rival() {
        let mut scn = ts::begin(USER);
        let clock = new_clock(&mut scn);
        profile::create_profile(&clock, ts::ctx(&mut scn));

        // commit prediksi #1
        ts::next_tx(&mut scn, USER);
        {
            let mut prof = ts::take_shared<PunditProfile>(&scn);
            receipt::commit_prediction(&mut prof, b"M1", b"b1", 1, &clock, ts::ctx(&mut scn));
            ts::return_shared(prof);
        };
        // tangkap id receipt #1 (saat ini satu-satunya / paling baru)
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

        // resolve keduanya = Wrong
        ts::next_tx(&mut scn, BACKEND);
        {
            let cap = oracle::new_cap_for_testing(ts::ctx(&mut scn));
            let mut prof = ts::take_shared<PunditProfile>(&scn);

            let mut r1 = ts::take_shared_by_id<PredictionReceipt>(&scn, id1);
            oracle::resolve_prediction(&cap, &mut prof, &mut r1, receipt::status_wrong(), ts::ctx(&mut scn));
            ts::return_shared(r1);

            let mut r2 = ts::take_shared_by_id<PredictionReceipt>(&scn, id2);
            oracle::resolve_prediction(&cap, &mut prof, &mut r2, receipt::status_wrong(), ts::ctx(&mut scn));
            ts::return_shared(r2);

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
        profile::create_profile(&clock, ts::ctx(&mut scn));

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
}
