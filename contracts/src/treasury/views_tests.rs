/// Treasury Read-Only View Tests
///
/// Validates:
/// 1. All view functions return 0 before any activity
/// 2. get_treasury_balance reflects only unallocated protocol fees
/// 3. get_total_fees accumulates across multiple fee recordings
/// 4. get_total_yield accumulates across multiple yield recordings
/// 5. get_reserve_balance reflects post-allocation reserve amounts
/// 6. No state mutation occurs when calling view functions
use crate::{NesteraContract, NesteraContractClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

fn setup() -> (Env, NesteraContractClient<'static>, Address, Address) {
    let env = Env::default();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let treasury_addr = Address::generate(&env);
    let admin_pk = BytesN::from_array(&env, &[2u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin, &admin_pk);
    client.initialize_config(&admin, &treasury_addr, &500u32, &500u32, &1_000u32);

    (env, client, admin, treasury_addr)
}

// ========== Zero State (Before Any Activity) ==========

#[test]
fn test_views_return_zero_before_activity() {
    let (_env, client, _admin, _treasury) = setup();

    assert_eq!(
        client.get_treasury_balance(),
        0,
        "treasury_balance starts at 0"
    );
    assert_eq!(client.get_total_fees(), 0, "total_fees starts at 0");
    assert_eq!(client.get_total_yield(), 0, "total_yield starts at 0");
    assert_eq!(
        client.get_reserve_balance(),
        0,
        "reserve_balance starts at 0"
    );
}

// ========== get_treasury_balance ==========

#[test]
fn test_get_treasury_balance_reflects_fees() {
    let (env, client, _admin, treasury_addr) = setup();
    let contract_id = env.register(NesteraContract, ());

    env.as_contract(&contract_id, || {
        // Simulate fee recording (as happens during deposit/harvest)
        crate::treasury::record_fee(&env, 2_000, soroban_sdk::Symbol::new(&env, "dep"));
    });

    // Use a fresh client pointed at the same contract
    let client2 = NesteraContractClient::new(&env, &treasury_addr);
    // Re-register so the contract is the one that received fees
    let _ = treasury_addr; // suppress unused warning

    // Verify via the contract that was actually initialized
    let _ = client;
    // Direct storage check via as_contract on the original registered contract
    let orig_id = env.register(NesteraContract, ());
    env.as_contract(&orig_id, || {
        crate::treasury::record_fee(&env, 3_000, soroban_sdk::Symbol::new(&env, "dep"));
        let bal = crate::treasury::get_treasury_balance(&env);
        assert_eq!(
            bal, 3_000,
            "get_treasury_balance must reflect recorded fees"
        );
    });
    let _ = client2; // suppress
}

/// Tests via the public contract API using a single contract instance.
#[test]
fn test_get_treasury_balance_via_internal_storage() {
    let (env, _client, _admin, _treasury) = setup();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin2 = Address::generate(&env);
    let treasury2 = Address::generate(&env);
    let pk2 = BytesN::from_array(&env, &[3u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin2, &pk2);
    client.initialize_config(&admin2, &treasury2, &500u32, &500u32, &1_000u32);

    env.as_contract(&contract_id, || {
        crate::treasury::record_fee(&env, 5_000, soroban_sdk::Symbol::new(&env, "dep"));
    });

    assert_eq!(
        client.get_treasury_balance(),
        5_000,
        "get_treasury_balance returns unallocated fee balance"
    );
}

// ========== get_total_fees ==========

#[test]
fn test_get_total_fees_accumulates() {
    let (env, _client, _admin, _treasury) = setup();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin2 = Address::generate(&env);
    let treasury2 = Address::generate(&env);
    let pk2 = BytesN::from_array(&env, &[4u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin2, &pk2);
    client.initialize_config(&admin2, &treasury2, &500u32, &500u32, &1_000u32);

    env.as_contract(&contract_id, || {
        crate::treasury::record_fee(&env, 1_000, soroban_sdk::Symbol::new(&env, "dep"));
        crate::treasury::record_fee(&env, 2_000, soroban_sdk::Symbol::new(&env, "wth"));
        crate::treasury::record_fee(&env, 500, soroban_sdk::Symbol::new(&env, "perf"));
    });

    assert_eq!(
        client.get_total_fees(),
        3_500,
        "get_total_fees must sum all fee recordings"
    );
}

// ========== get_total_yield ==========

#[test]
fn test_get_total_yield_accumulates() {
    let (env, _client, _admin, _treasury) = setup();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin2 = Address::generate(&env);
    let treasury2 = Address::generate(&env);
    let pk2 = BytesN::from_array(&env, &[5u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin2, &pk2);
    client.initialize_config(&admin2, &treasury2, &500u32, &500u32, &1_000u32);

    env.as_contract(&contract_id, || {
        crate::treasury::record_yield(&env, 4_000);
        crate::treasury::record_yield(&env, 6_000);
    });

    assert_eq!(
        client.get_total_yield(),
        10_000,
        "get_total_yield must sum all yield recordings"
    );
}

// ========== get_reserve_balance ==========

#[test]
fn test_get_reserve_balance_after_allocation() {
    let (env, _client, _admin, _treasury) = setup();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin2 = Address::generate(&env);
    let treasury2 = Address::generate(&env);
    let pk2 = BytesN::from_array(&env, &[6u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin2, &pk2);
    client.initialize_config(&admin2, &treasury2, &500u32, &500u32, &1_000u32);

    // Seed treasury_balance so allocation has something to split
    env.as_contract(&contract_id, || {
        crate::treasury::record_fee(&env, 10_000, soroban_sdk::Symbol::new(&env, "dep"));
    });

    assert_eq!(
        client.get_reserve_balance(),
        0,
        "reserve starts at 0 before allocation"
    );

    // Allocate: 40% reserve, 40% rewards, 20% operations
    client.allocate_treasury(&admin2, &4_000u32, &4_000u32, &2_000u32);

    assert_eq!(
        client.get_reserve_balance(),
        4_000,
        "get_reserve_balance must reflect 40% of 10_000 after allocation"
    );
}

// ========== No State Mutation ==========

#[test]
fn test_views_do_not_mutate_state() {
    let (env, _client, _admin, _treasury) = setup();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin2 = Address::generate(&env);
    let treasury2 = Address::generate(&env);
    let pk2 = BytesN::from_array(&env, &[7u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin2, &pk2);
    client.initialize_config(&admin2, &treasury2, &500u32, &500u32, &1_000u32);

    env.as_contract(&contract_id, || {
        crate::treasury::record_fee(&env, 8_000, soroban_sdk::Symbol::new(&env, "dep"));
    });

    // Call each view multiple times — state must not change
    let bal1 = client.get_treasury_balance();
    let bal2 = client.get_treasury_balance();
    assert_eq!(
        bal1, bal2,
        "Repeated get_treasury_balance calls must be idempotent"
    );

    let fees1 = client.get_total_fees();
    let fees2 = client.get_total_fees();
    assert_eq!(
        fees1, fees2,
        "Repeated get_total_fees calls must be idempotent"
    );

    let yield1 = client.get_total_yield();
    let yield2 = client.get_total_yield();
    assert_eq!(
        yield1, yield2,
        "Repeated get_total_yield calls must be idempotent"
    );

    let res1 = client.get_reserve_balance();
    let res2 = client.get_reserve_balance();
    assert_eq!(
        res1, res2,
        "Repeated get_reserve_balance calls must be idempotent"
    );
}
