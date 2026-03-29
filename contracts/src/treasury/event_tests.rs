use crate::treasury::types::TreasuryPool;
use crate::{NesteraContract, NesteraContractClient};
use soroban_sdk::{
    testutils::{Address as _, Events},
    Address, BytesN, Env, IntoVal, Symbol, TryFromVal, Val,
};

fn setup() -> (
    Env,
    Address,
    NesteraContractClient<'static>,
    Address,
    Address,
) {
    let env = Env::default();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let treasury_addr = Address::generate(&env);
    let admin_pk = BytesN::from_array(&env, &[9u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin, &admin_pk);
    client.initialize_config(&admin, &treasury_addr, &100u32, &100u32, &100u32);

    (env, contract_id, client, admin, treasury_addr)
}

fn has_indexed_event(
    env: &Env,
    contract_id: &Address,
    event_name: &str,
    indexed_1: Option<Val>,
    indexed_2: Option<Val>,
) -> bool {
    fn index_matches(env: &Env, actual: Val, expected: Val) -> bool {
        if actual.shallow_eq(&expected) {
            return true;
        }
        if let (Ok(actual_symbol), Ok(expected_symbol)) = (
            Symbol::try_from_val(env, &actual),
            Symbol::try_from_val(env, &expected),
        ) {
            return actual_symbol == expected_symbol;
        }
        if let (Ok(actual_address), Ok(expected_address)) = (
            Address::try_from_val(env, &actual),
            Address::try_from_val(env, &expected),
        ) {
            return actual_address == expected_address;
        }
        false
    }

    let events = env.events().all();
    for i in 0..events.len() {
        if let Some((event_contract, topics, data)) = events.get(i) {
            if event_contract != *contract_id {
                continue;
            }
            let Some(topic0) = topics.get(0) else {
                continue;
            };
            let Ok(topic0_symbol) = Symbol::try_from_val(env, &topic0) else {
                continue;
            };
            if topic0_symbol != Symbol::new(env, event_name) {
                continue;
            }
            if let Some(expected_1) = indexed_1.clone() {
                let Some(topic1) = topics.get(1) else {
                    continue;
                };
                if !index_matches(env, topic1, expected_1) {
                    continue;
                }
            }
            if let Some(expected_2) = indexed_2.clone() {
                let Some(topic2) = topics.get(2) else {
                    continue;
                };
                if !index_matches(env, topic2, expected_2) {
                    continue;
                }
            }
            let _ = data;
            return true;
        }
    }
    false
}

#[test]
fn test_fee_collected_event_emitted() {
    let (env, contract_id, _client, _admin, _treasury_addr) = setup();
    env.as_contract(&contract_id, || {
        crate::treasury::record_fee(&env, 2_500, Symbol::new(&env, "dep"));
    });

    assert!(
        has_indexed_event(
            &env,
            &contract_id,
            "FeeCollected",
            Some(Symbol::new(&env, "dep").into_val(&env)),
            None,
        ),
        "FeeCollected event must be emitted with indexed fee type"
    );
}

#[test]
fn test_treasury_allocated_event_emitted() {
    let (env, contract_id, client, admin, _treasury_addr) = setup();
    env.as_contract(&contract_id, || {
        crate::treasury::record_fee(&env, 10_000, Symbol::new(&env, "dep"));
    });
    client.allocate_treasury(&admin, &4_000u32, &4_000u32, &2_000u32);

    assert!(
        has_indexed_event(
            &env,
            &contract_id,
            "TreasuryAllocated",
            Some(admin.clone().into_val(&env)),
            None,
        ),
        "TreasuryAllocated event must be emitted with indexed admin"
    );
}

#[test]
fn test_treasury_withdrawn_and_reserve_used_events_emitted() {
    let (env, contract_id, client, admin, _treasury_addr) = setup();
    env.as_contract(&contract_id, || {
        crate::treasury::record_fee(&env, 20_000, Symbol::new(&env, "dep"));
    });
    client.allocate_treasury(&admin, &5_000u32, &3_000u32, &2_000u32);
    client.set_treasury_limits(&admin, &5_000, &10_000);
    client.withdraw_treasury(&admin, &TreasuryPool::Reserve, &2_500);

    assert!(
        has_indexed_event(
            &env,
            &contract_id,
            "TreasuryWithdrawn",
            Some(admin.clone().into_val(&env)),
            Some(Symbol::new(&env, "reserve").into_val(&env)),
        ),
        "TreasuryWithdrawn event must be emitted with indexed admin and pool"
    );

    assert!(
        has_indexed_event(
            &env,
            &contract_id,
            "ReserveUsed",
            Some(admin.clone().into_val(&env)),
            None,
        ),
        "ReserveUsed event must be emitted when reserve pool is used"
    );
}

#[test]
fn test_yield_distributed_event_emitted() {
    let (env, contract_id, _client, _admin, _treasury_addr) = setup();
    env.as_contract(&contract_id, || {
        crate::treasury::record_yield(&env, 1_234);
    });

    assert!(
        has_indexed_event(&env, &contract_id, "YieldDistributed", None, None),
        "YieldDistributed event must be emitted for treasury yield records"
    );
}
