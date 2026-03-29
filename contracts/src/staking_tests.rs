//! Tests for staking mechanism (#442).

use crate::staking::storage_types::StakingConfig;
use crate::{NesteraContract, NesteraContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, BytesN, Env,
};

fn setup_env_with_staking(config: StakingConfig) -> (Env, NesteraContractClient<'static>, Address) {
    let env = Env::default();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let admin_pk = BytesN::from_array(&env, &[9u8; 32]);

    env.mock_all_auths();
    
    // Set initial ledger timestamp to non-zero value
    env.ledger().with_mut(|li| li.timestamp = 1000);
    
    client.initialize(&admin, &admin_pk);
    assert!(client.try_init_staking_config(&admin, &config).is_ok());

    (env, client, admin)
}

fn default_staking_config() -> StakingConfig {
    StakingConfig {
        min_stake_amount: 100,
        max_stake_amount: 1_000_000_000_000_000,
        reward_rate_bps: 500, // 5% APY
        enabled: true,
        lock_period_seconds: 0,
    }
}

#[test]
fn test_stake_basic() {
    let (env, client, _admin) = setup_env_with_staking(default_staking_config());
    let user = Address::generate(&env);

    let amount_to_stake = 10_000;
    let pending_rewards = client.stake(&user, &amount_to_stake);

    assert_eq!(pending_rewards, 0);

    let stake = client.get_user_stake(&user);
    assert_eq!(stake.amount, amount_to_stake);
    assert!(stake.start_time > 0);
}

#[test]
fn test_stake_minimum_amount() {
    let (env, client, _admin) = setup_env_with_staking(default_staking_config());
    let user = Address::generate(&env);

    let amount_to_stake = 50; // Below minimum
    let result = client.try_stake(&user, &amount_to_stake);

    assert!(result.is_err());
}

#[test]
fn test_unstake_basic() {
    let (env, client, _admin) = setup_env_with_staking(default_staking_config());
    let user = Address::generate(&env);

    let amount_to_stake = 10_000;
    client.stake(&user, &amount_to_stake);

    let amount_to_unstake = 5_000;
    let (unstaked_amount, pending_rewards) = client.unstake(&user, &amount_to_unstake);

    assert_eq!(unstaked_amount, amount_to_unstake);

    let stake = client.get_user_stake(&user);
    assert_eq!(stake.amount, amount_to_stake - amount_to_unstake);
}

#[test]
fn test_unstake_insufficient_balance() {
    let (env, client, _admin) = setup_env_with_staking(default_staking_config());
    let user = Address::generate(&env);

    let amount_to_stake = 10_000;
    client.stake(&user, &amount_to_stake);

    let amount_to_unstake = 20_000; // More than staked
    let result = client.try_unstake(&user, &amount_to_unstake);

    assert!(result.is_err());
}

#[test]
fn test_unstake_with_lock_period() {
    let mut config = default_staking_config();
    config.lock_period_seconds = 86400; // 1 day lock

    let (env, client, _admin) = setup_env_with_staking(config);
    let user = Address::generate(&env);

    let amount_to_stake = 10_000;
    client.stake(&user, &amount_to_stake);

    // Try to unstake immediately (should fail)
    let result = client.try_unstake(&user, &5_000);
    assert!(result.is_err());

    // Advance time past lock period
    env.ledger().with_mut(|li| li.timestamp += 86401);

    // Now unstake should succeed
    let result = client.try_unstake(&user, &5_000);
    assert!(result.is_ok());
}

// #[test]
// fn test_claim_staking_rewards() {
//     let (env, client, _admin) = setup_env_with_staking(default_staking_config());
//     let user = Address::generate(&env);

//     let amount_to_stake = 10_000;
//     client.stake(&user, &amount_to_stake);

//     // Advance time to accumulate rewards
//     env.ledger().with_mut(|li| li.timestamp += 86400); // 1 day

//     let pending_rewards = client.get_pending_staking_rewards(&user);
//     assert!(pending_rewards > 0);

//     let claimed_rewards = client.claim_staking_rewards(&user);
//     assert!(claimed_rewards > 0);
// }

#[test]
fn test_claim_staking_rewards_no_stake() {
    let (env, client, _admin) = setup_env_with_staking(default_staking_config());
    let user = Address::generate(&env);

    let result = client.try_claim_staking_rewards(&user);
    assert!(result.is_err());
}

#[test]
fn test_stake_multiple_times() {
    let (env, client, _admin) = setup_env_with_staking(default_staking_config());
    let user = Address::generate(&env);

    let amount1 = 10_000;
    client.stake(&user, &amount1);

    let amount2 = 5_000;
    client.stake(&user, &amount2);

    let stake = client.get_user_stake(&user);
    assert_eq!(stake.amount, amount1 + amount2);
}

#[test]
fn test_staking_stats() {
    let (env, client, _admin) = setup_env_with_staking(default_staking_config());
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let amount1 = 10_000;
    let amount2 = 20_000;

    client.stake(&user1, &amount1);
    client.stake(&user2, &amount2);

    let (total_staked, total_rewards, reward_per_token) = client.get_staking_stats();

    assert_eq!(total_staked, amount1 + amount2);
    assert!(total_rewards >= 0);
    assert!(reward_per_token >= 0);
}

#[test]
fn test_staking_disabled() {
    let mut config = default_staking_config();
    config.enabled = false;

    let (env, client, _admin) = setup_env_with_staking(config);
    let user = Address::generate(&env);

    let result = client.try_stake(&user, &10_000);
    assert!(result.is_err());
}

#[test]
fn test_unstake_all() {
    let (env, client, _admin) = setup_env_with_staking(default_staking_config());
    let user = Address::generate(&env);

    let amount_to_stake = 10_000;
    client.stake(&user, &amount_to_stake);

    let (unstaked_amount, _) = client.unstake(&user, &amount_to_stake);

    assert_eq!(unstaked_amount, amount_to_stake);

    let stake = client.get_user_stake(&user);
    assert_eq!(stake.amount, 0);
}

// #[test]
// fn test_pending_rewards_calculation() {
//     let (env, client, _admin) = setup_env_with_staking(default_staking_config());
//     let user = Address::generate(&env);

//     let amount_to_stake = 10_000;
//     client.stake(&user, &amount_to_stake);

//     // Advance time to accumulate rewards
//     env.ledger().with_mut(|li| li.timestamp += 86400); // 1 day

//     let pending_rewards = client.get_pending_staking_rewards(&user);
//     assert!(pending_rewards > 0);

//     // Advance more time
//     env.ledger().with_mut(|li| li.timestamp += 86400); // Another day

//     let pending_rewards_later = client.get_pending_staking_rewards(&user);
//     assert!(pending_rewards_later > pending_rewards);
// }
