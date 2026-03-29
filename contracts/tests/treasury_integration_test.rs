#![cfg(test)]

use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, Address, BytesN, Env, InvokeError, Symbol,
};

use Nestera::strategy::interface::YieldStrategy;
use Nestera::treasury::types::TreasuryPool;
use Nestera::{NesteraContract, NesteraContractClient, SavingsError};

// Mock strategy used to produce deterministic yield in integration flow.
#[contract]
pub struct MockYieldStrategy;

#[contractimpl]
impl MockYieldStrategy {
    pub fn simulate_yield(env: Env, amount: i128) {
        let sym = Symbol::new(&env, "yield");
        let current: i128 = env.storage().instance().get(&sym).unwrap_or(0);
        env.storage().instance().set(&sym, &(current + amount));
    }
}

#[contractimpl]
impl YieldStrategy for MockYieldStrategy {
    fn strategy_deposit(env: Env, _from: Address, amount: i128) -> i128 {
        let sym = Symbol::new(&env, "principal");
        let current: i128 = env.storage().instance().get(&sym).unwrap_or(0);
        env.storage().instance().set(&sym, &(current + amount));
        amount
    }

    fn strategy_withdraw(env: Env, _to: Address, amount: i128) -> i128 {
        let sym = Symbol::new(&env, "principal");
        let current: i128 = env.storage().instance().get(&sym).unwrap_or(0);
        env.storage().instance().set(&sym, &(current - amount));
        amount
    }

    fn strategy_harvest(env: Env, _to: Address) -> i128 {
        let sym = Symbol::new(&env, "yield");
        let current: i128 = env.storage().instance().get(&sym).unwrap_or(0);
        env.storage().instance().set(&sym, &0i128);
        current
    }

    fn strategy_balance(env: Env, _addr: Address) -> i128 {
        let p_sym = Symbol::new(&env, "principal");
        let y_sym = Symbol::new(&env, "yield");
        let principal: i128 = env.storage().instance().get(&p_sym).unwrap_or(0);
        let pending_yield: i128 = env.storage().instance().get(&y_sym).unwrap_or(0);
        principal + pending_yield
    }
}

fn setup() -> (
    Env,
    NesteraContractClient<'static>,
    Address,
    Address,
    Address,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let treasury_addr = Address::generate(&env);
    let strategy_addr = env.register(MockYieldStrategy, ());
    let admin_pk = BytesN::from_array(&env, &[4u8; 32]);

    client.initialize(&admin, &admin_pk);
    // 10% deposit/withdraw/performance fees to make treasury math explicit.
    client.initialize_config(&admin, &treasury_addr, &1_000u32, &1_000u32, &1_000u32);
    client.initialize_user(&user);
    client.register_strategy(&admin, &strategy_addr, &1u32);

    (env, client, admin, user, treasury_addr, strategy_addr)
}

fn assert_savings_error(err: Result<SavingsError, InvokeError>, expected: SavingsError) {
    assert_eq!(err, Ok(expected));
}

#[test]
fn test_treasury_full_lifecycle_integration_flow() {
    let (env, client, admin, user, _treasury_addr, strategy_addr) = setup();

    // 1) Collect fees from deposits (10% of 50_000 = 5_000 fee).
    client.deposit_flexi(&user, &50_000);
    assert_eq!(client.get_treasury_balance(), 5_000);
    assert_eq!(client.get_total_fees(), 5_000);

    // 2) Harvest yield (10% of 2_000 = 200 fee, 1_800 user yield).
    let lock_id = client.create_lock_save(&user, &10_000, &(30 * 86_400));
    client.route_lock_to_strategy(&user, &lock_id, &strategy_addr, &10_000);
    let mock_client = MockYieldStrategyClient::new(&env, &strategy_addr);
    mock_client.simulate_yield(&2_000);
    let harvested = client.harvest_strategy(&admin, &strategy_addr);
    assert_eq!(harvested, 2_000);
    assert_eq!(client.get_total_yield(), 1_800);
    assert_eq!(client.get_total_fees(), 5_200);
    assert_eq!(client.get_treasury_balance(), 5_200);

    // 3) Allocate treasury funds (40/40/20 split).
    let treasury_after_alloc = client.allocate_treasury(&admin, &4_000, &4_000, &2_000);
    assert_eq!(treasury_after_alloc.treasury_balance, 0);
    assert_eq!(treasury_after_alloc.reserve_balance, 2_080);
    assert_eq!(treasury_after_alloc.rewards_balance, 2_080);
    assert_eq!(treasury_after_alloc.operations_balance, 1_040);
    assert_eq!(client.get_reserve_balance(), 2_080);

    // 4) Use reserve in an edge case (attempt overdraw should fail, valid draw succeeds).
    client.set_treasury_limits(&admin, &3_000, &6_000);
    assert_savings_error(
        client
            .try_withdraw_treasury(&admin, &TreasuryPool::Reserve, &2_500)
            .unwrap_err(),
        SavingsError::InsufficientBalance,
    );
    client.withdraw_treasury(&admin, &TreasuryPool::Reserve, &1_000);

    // 5) Withdraw via governance/admin path from another pool.
    client.withdraw_treasury(&admin, &TreasuryPool::Rewards, &500);

    // 6) Validate balances and invariants throughout.
    let final_treasury = client.get_treasury();
    assert_eq!(final_treasury.total_fees_collected, 5_200);
    assert_eq!(final_treasury.total_yield_earned, 1_800);
    assert_eq!(final_treasury.treasury_balance, 0);
    assert_eq!(final_treasury.reserve_balance, 1_080);
    assert_eq!(final_treasury.rewards_balance, 1_580);
    assert_eq!(final_treasury.operations_balance, 1_040);

    // No inconsistency: remaining allocated balances equal allocated total minus withdrawals.
    let remaining_allocated = final_treasury.reserve_balance
        + final_treasury.rewards_balance
        + final_treasury.operations_balance;
    assert_eq!(remaining_allocated, 3_700);
}
