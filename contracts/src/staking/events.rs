//! Event definitions and helpers for the staking module (#442).

use soroban_sdk::{symbol_short, Address, Env};

use super::storage_types::{StakeCreated, StakeWithdrawn, StakingRewardsClaimed};

/// Emits a StakeCreated event.
pub fn emit_stake_created(env: &Env, user: Address, amount: i128, total_staked: i128) {
    let event = StakeCreated {
        user: user.clone(),
        amount,
        total_staked,
    };
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("stake"), user),
        event,
    );
}

/// Emits a StakeWithdrawn event.
pub fn emit_stake_withdrawn(env: &Env, user: Address, amount: i128, total_staked: i128) {
    let event = StakeWithdrawn {
        user: user.clone(),
        amount,
        total_staked,
    };
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("unstake"), user),
        event,
    );
}

/// Emits a StakingRewardsClaimed event.
pub fn emit_staking_rewards_claimed(env: &Env, user: Address, amount: i128) {
    let event = StakingRewardsClaimed {
        user: user.clone(),
        amount,
    };
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("rewards"), user),
        event,
    );
}
