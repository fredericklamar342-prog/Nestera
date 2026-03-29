use crate::treasury::types::TreasuryPool;
use crate::{NesteraContract, NesteraContractClient, SavingsError};
use soroban_sdk::{
    testutils::Address as _, testutils::Ledger as _, Address, BytesN, Env, InvokeError,
};

fn setup() -> (
    Env,
    soroban_sdk::Address,
    NesteraContractClient<'static>,
    Address,
) {
    let env = Env::default();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let treasury_addr = Address::generate(&env);
    let admin_pk = BytesN::from_array(&env, &[8u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin, &admin_pk);
    client.initialize_config(&admin, &treasury_addr, &100u32, &100u32, &100u32);

    (env, contract_id, client, admin)
}

fn seed_and_allocate(
    env: &Env,
    contract_id: &Address,
    client: &NesteraContractClient<'_>,
    admin: &Address,
    fees: i128,
    reserve_percent: u32,
    rewards_percent: u32,
    operations_percent: u32,
) {
    env.as_contract(contract_id, || {
        crate::treasury::record_fee(env, fees, soroban_sdk::Symbol::new(env, "dep"));
    });
    client.allocate_treasury(
        admin,
        &reserve_percent,
        &rewards_percent,
        &operations_percent,
    );
}

fn assert_savings_error(err: Result<SavingsError, InvokeError>, expected: SavingsError) {
    assert_eq!(err, Ok(expected));
}

#[test]
fn test_max_withdrawal_limit_per_transaction_enforced() {
    let (env, contract_id, client, admin) = setup();
    env.mock_all_auths();

    seed_and_allocate(
        &env,
        &contract_id,
        &client,
        &admin,
        20_000,
        5_000,
        3_000,
        2_000,
    );
    client.set_treasury_limits(&admin, &1_000, &8_000);

    assert_savings_error(
        client
            .try_withdraw_treasury(&admin, &TreasuryPool::Reserve, &1_001)
            .unwrap_err(),
        SavingsError::AmountExceedsLimit,
    );
}

#[test]
fn test_daily_withdrawal_cap_enforced_across_multiple_operations() {
    let (env, contract_id, client, admin) = setup();
    env.mock_all_auths();

    seed_and_allocate(
        &env,
        &contract_id,
        &client,
        &admin,
        30_000,
        5_000,
        3_000,
        2_000,
    );
    client.set_treasury_limits(&admin, &3_000, &4_000);

    assert!(client
        .try_withdraw_treasury(&admin, &TreasuryPool::Reserve, &2_500)
        .is_ok());

    assert_savings_error(
        client
            .try_withdraw_treasury(&admin, &TreasuryPool::Rewards, &1_600)
            .unwrap_err(),
        SavingsError::AmountExceedsLimit,
    );
}

#[test]
fn test_daily_withdrawal_cap_resets_after_24_hours() {
    let (env, contract_id, client, admin) = setup();
    env.mock_all_auths();

    seed_and_allocate(
        &env,
        &contract_id,
        &client,
        &admin,
        30_000,
        5_000,
        3_000,
        2_000,
    );
    client.set_treasury_limits(&admin, &3_000, &4_000);

    assert!(client
        .try_withdraw_treasury(&admin, &TreasuryPool::Reserve, &3_000)
        .is_ok());
    assert_savings_error(
        client
            .try_withdraw_treasury(&admin, &TreasuryPool::Rewards, &1_100)
            .unwrap_err(),
        SavingsError::AmountExceedsLimit,
    );

    env.ledger().with_mut(|li| {
        li.timestamp += 24 * 60 * 60 + 1;
    });

    assert!(client
        .try_withdraw_treasury(&admin, &TreasuryPool::Rewards, &3_000)
        .is_ok());
}

#[test]
fn test_treasury_withdrawal_validates_pool_balance() {
    let (env, contract_id, client, admin) = setup();
    env.mock_all_auths();

    seed_and_allocate(
        &env,
        &contract_id,
        &client,
        &admin,
        10_000,
        4_000,
        4_000,
        2_000,
    );
    client.set_treasury_limits(&admin, &10_000, &20_000);

    assert_savings_error(
        client
            .try_withdraw_treasury(&admin, &TreasuryPool::Operations, &2_001)
            .unwrap_err(),
        SavingsError::InsufficientBalance,
    );
}

#[test]
fn test_non_admin_cannot_update_limits_or_withdraw() {
    let (env, contract_id, client, admin) = setup();
    let non_admin = Address::generate(&env);
    env.mock_all_auths();

    seed_and_allocate(
        &env,
        &contract_id,
        &client,
        &admin,
        15_000,
        5_000,
        3_000,
        2_000,
    );

    assert_savings_error(
        client
            .try_set_treasury_limits(&non_admin, &1_000, &3_000)
            .unwrap_err(),
        SavingsError::Unauthorized,
    );
    assert_savings_error(
        client
            .try_withdraw_treasury(&non_admin, &TreasuryPool::Reserve, &500)
            .unwrap_err(),
        SavingsError::Unauthorized,
    );
}
