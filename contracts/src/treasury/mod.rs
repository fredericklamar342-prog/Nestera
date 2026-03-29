pub mod types;

#[cfg(test)]
mod event_tests;
#[cfg(test)]
mod security_tests;
#[cfg(test)]
mod views_tests;

use crate::errors::SavingsError;
use crate::storage_types::DataKey;
use soroban_sdk::{symbol_short, Address, Env, Symbol};
use types::{
    AllocationConfig, Treasury, TreasuryDailyWithdrawal, TreasuryPool, TreasurySecurityConfig,
};

const TREASURY_DAILY_WINDOW_SECS: u64 = 24 * 60 * 60;
const EVENT_FEE_COLLECTED: &str = "FeeCollected";
const EVENT_TREASURY_ALLOCATED: &str = "TreasuryAllocated";
const EVENT_TREASURY_WITHDRAWN: &str = "TreasuryWithdrawn";
const EVENT_RESERVE_USED: &str = "ReserveUsed";
const EVENT_YIELD_DISTRIBUTED: &str = "YieldDistributed";

// ========== Treasury Storage Helpers ==========

/// Retrieves the Treasury struct from persistent storage.
pub fn get_treasury(env: &Env) -> Treasury {
    env.storage()
        .persistent()
        .get(&DataKey::Treasury)
        .unwrap_or(Treasury::new())
}

/// Saves the Treasury struct to persistent storage.
fn set_treasury(env: &Env, treasury: &Treasury) {
    env.storage().persistent().set(&DataKey::Treasury, treasury);
}

fn require_admin(env: &Env, admin: &Address) -> Result<(), SavingsError> {
    let stored_admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(SavingsError::Unauthorized)?;
    if stored_admin != *admin {
        return Err(SavingsError::Unauthorized);
    }
    admin.require_auth();
    Ok(())
}

fn validate_treasury_state(treasury: &Treasury) -> Result<(), SavingsError> {
    if treasury.total_fees_collected < 0
        || treasury.total_yield_earned < 0
        || treasury.reserve_balance < 0
        || treasury.treasury_balance < 0
        || treasury.rewards_balance < 0
        || treasury.operations_balance < 0
    {
        return Err(SavingsError::InvariantViolation);
    }
    Ok(())
}

fn get_treasury_limits_internal(env: &Env) -> TreasurySecurityConfig {
    env.storage()
        .persistent()
        .get(&DataKey::TreasurySecurityConfig)
        .unwrap_or(TreasurySecurityConfig::default_limits())
}

fn set_treasury_limits_internal(env: &Env, limits: &TreasurySecurityConfig) {
    env.storage()
        .persistent()
        .set(&DataKey::TreasurySecurityConfig, limits);
}

fn get_daily_withdrawal_tracker(env: &Env) -> TreasuryDailyWithdrawal {
    let now = env.ledger().timestamp();
    env.storage()
        .persistent()
        .get(&DataKey::TreasuryDailyWithdrawal)
        .unwrap_or(TreasuryDailyWithdrawal::new(now))
}

fn set_daily_withdrawal_tracker(env: &Env, tracker: &TreasuryDailyWithdrawal) {
    env.storage()
        .persistent()
        .set(&DataKey::TreasuryDailyWithdrawal, tracker);
}

fn pool_to_symbol(env: &Env, pool: &TreasuryPool) -> Symbol {
    match pool {
        TreasuryPool::Reserve => Symbol::new(env, "reserve"),
        TreasuryPool::Rewards => Symbol::new(env, "rewards"),
        TreasuryPool::Operations => Symbol::new(env, "operations"),
    }
}

// ========== Treasury Initialization ==========

/// Initializes the treasury with default zero values.
/// Called during `initialize_config`.
pub fn initialize_treasury(env: &Env) {
    let treasury = Treasury::new();
    set_treasury(env, &treasury);
    set_treasury_limits_internal(env, &TreasurySecurityConfig::default_limits());
    set_daily_withdrawal_tracker(env, &TreasuryDailyWithdrawal::new(env.ledger().timestamp()));
}

// ========== Fee Recording ==========

/// Records a collected fee into the treasury and emits a FeeCollected event.
///
/// # Arguments
/// * `env` - The contract environment
/// * `amount` - The fee amount collected
/// * `fee_type` - A short symbol describing the fee type (e.g., "dep", "wth", "perf")
pub fn record_fee(env: &Env, amount: i128, fee_type: soroban_sdk::Symbol) {
    if amount <= 0 {
        return;
    }
    let mut treasury = get_treasury(env);
    if let Some(updated_total_fees) = treasury.total_fees_collected.checked_add(amount) {
        treasury.total_fees_collected = updated_total_fees;
    } else {
        return;
    }
    if let Some(updated_treasury_balance) = treasury.treasury_balance.checked_add(amount) {
        treasury.treasury_balance = updated_treasury_balance;
    } else {
        return;
    }
    if validate_treasury_state(&treasury).is_err() {
        return;
    }
    set_treasury(env, &treasury);

    env.events()
        .publish((symbol_short!("fee_col"), fee_type.clone()), amount);
    env.events()
        .publish((Symbol::new(env, EVENT_FEE_COLLECTED), fee_type), amount);
}

/// Records yield earned into the treasury.
pub fn record_yield(env: &Env, amount: i128) {
    if amount <= 0 {
        return;
    }
    let mut treasury = get_treasury(env);
    if let Some(updated_total_yield) = treasury.total_yield_earned.checked_add(amount) {
        treasury.total_yield_earned = updated_total_yield;
    } else {
        return;
    }
    if validate_treasury_state(&treasury).is_err() {
        return;
    }
    set_treasury(env, &treasury);
    env.events().publish(
        (Symbol::new(env, EVENT_YIELD_DISTRIBUTED),),
        (amount, treasury.total_yield_earned),
    );
}

// ========== Read-Only Treasury Views ==========

/// Returns only the unallocated treasury balance (fees awaiting allocation).
pub fn get_treasury_balance(env: &Env) -> i128 {
    get_treasury(env).treasury_balance
}

/// Returns the cumulative total of all protocol fees collected.
pub fn get_total_fees(env: &Env) -> i128 {
    get_treasury(env).total_fees_collected
}

/// Returns the cumulative total of all yield credited to users.
pub fn get_total_yield(env: &Env) -> i128 {
    get_treasury(env).total_yield_earned
}

/// Returns the current reserve sub-balance (allocated funds held as reserve).
pub fn get_reserve_balance(env: &Env) -> i128 {
    get_treasury(env).reserve_balance
}

/// Returns current treasury withdrawal safety limits.
pub fn get_treasury_limits(env: &Env) -> TreasurySecurityConfig {
    get_treasury_limits_internal(env)
}

/// Updates treasury withdrawal limits (admin only).
pub fn set_treasury_limits(
    env: &Env,
    admin: &Address,
    max_withdrawal_per_tx: i128,
    daily_withdrawal_cap: i128,
) -> Result<TreasurySecurityConfig, SavingsError> {
    require_admin(env, admin)?;

    if max_withdrawal_per_tx <= 0 || daily_withdrawal_cap <= 0 {
        return Err(SavingsError::InvalidAmount);
    }
    if max_withdrawal_per_tx > daily_withdrawal_cap {
        return Err(SavingsError::AmountExceedsLimit);
    }

    let limits = TreasurySecurityConfig {
        max_withdrawal_per_tx,
        daily_withdrawal_cap,
    };
    set_treasury_limits_internal(env, &limits);
    env.events().publish(
        (symbol_short!("trs_lim"),),
        (max_withdrawal_per_tx, daily_withdrawal_cap),
    );

    Ok(limits)
}

/// Withdraws from a treasury sub-balance with per-tx and daily safety caps (admin only).
pub fn withdraw_treasury(
    env: &Env,
    admin: &Address,
    pool: TreasuryPool,
    amount: i128,
) -> Result<Treasury, SavingsError> {
    require_admin(env, admin)?;
    if amount <= 0 {
        return Err(SavingsError::InvalidAmount);
    }

    let limits = get_treasury_limits_internal(env);
    if amount > limits.max_withdrawal_per_tx {
        return Err(SavingsError::AmountExceedsLimit);
    }

    let now = env.ledger().timestamp();
    let mut daily = get_daily_withdrawal_tracker(env);
    if now.saturating_sub(daily.window_start_ts) >= TREASURY_DAILY_WINDOW_SECS {
        daily = TreasuryDailyWithdrawal::new(now);
    }

    let new_daily_total = daily
        .withdrawn_amount
        .checked_add(amount)
        .ok_or(SavingsError::Overflow)?;
    if new_daily_total > limits.daily_withdrawal_cap {
        return Err(SavingsError::AmountExceedsLimit);
    }

    let mut treasury = get_treasury(env);
    match pool.clone() {
        TreasuryPool::Reserve => {
            if amount > treasury.reserve_balance {
                return Err(SavingsError::InsufficientBalance);
            }
            treasury.reserve_balance = treasury
                .reserve_balance
                .checked_sub(amount)
                .ok_or(SavingsError::InsufficientBalance)?;
        }
        TreasuryPool::Rewards => {
            if amount > treasury.rewards_balance {
                return Err(SavingsError::InsufficientBalance);
            }
            treasury.rewards_balance = treasury
                .rewards_balance
                .checked_sub(amount)
                .ok_or(SavingsError::InsufficientBalance)?;
        }
        TreasuryPool::Operations => {
            if amount > treasury.operations_balance {
                return Err(SavingsError::InsufficientBalance);
            }
            treasury.operations_balance = treasury
                .operations_balance
                .checked_sub(amount)
                .ok_or(SavingsError::InsufficientBalance)?;
        }
    }

    validate_treasury_state(&treasury)?;
    daily.withdrawn_amount = new_daily_total;
    set_treasury(env, &treasury);
    set_daily_withdrawal_tracker(env, &daily);
    let pool_symbol = pool_to_symbol(env, &pool);
    env.events().publish(
        (
            Symbol::new(env, EVENT_TREASURY_WITHDRAWN),
            admin.clone(),
            pool_symbol,
        ),
        (amount, new_daily_total),
    );
    env.events().publish(
        (symbol_short!("trs_wth"),),
        (pool.clone(), amount, new_daily_total),
    );
    if pool == TreasuryPool::Reserve {
        env.events().publish(
            (Symbol::new(env, EVENT_RESERVE_USED), admin.clone()),
            (amount, treasury.reserve_balance),
        );
    }

    Ok(treasury)
}

// ========== Allocation Logic ==========

/// Allocates the unallocated treasury balance into reserves, rewards, and operations.
///
/// The allocation percentages are provided as basis points (e.g., 4000 = 40%).
/// They MUST sum to exactly 10_000 (100%).
///
/// # Arguments
/// * `env` - The contract environment
/// * `admin` - The admin address (must match the stored admin)
/// * `reserve_percent` - Reserve allocation in basis points
/// * `rewards_percent` - Rewards allocation in basis points
/// * `operations_percent` - Operations allocation in basis points
///
/// # Errors
/// * `SavingsError::Unauthorized` - If caller is not admin
/// * `SavingsError::InvalidAmount` - If percentages don't sum to 10_000
pub fn allocate_treasury(
    env: &Env,
    admin: &Address,
    reserve_percent: u32,
    rewards_percent: u32,
    operations_percent: u32,
) -> Result<Treasury, SavingsError> {
    require_admin(env, admin)?;

    // Validate percentages sum to 100%
    let total = reserve_percent
        .checked_add(rewards_percent)
        .and_then(|s| s.checked_add(operations_percent))
        .ok_or(SavingsError::Overflow)?;

    if total != 10_000 {
        return Err(SavingsError::InvalidAmount);
    }

    let mut treasury = get_treasury(env);
    let available = treasury.treasury_balance;

    if available <= 0 {
        return Ok(treasury);
    }

    // Calculate splits
    let reserve_amount = available
        .checked_mul(reserve_percent as i128)
        .ok_or(SavingsError::Overflow)?
        / 10_000;
    let rewards_amount = available
        .checked_mul(rewards_percent as i128)
        .ok_or(SavingsError::Overflow)?
        / 10_000;
    // Operations gets the remainder to avoid rounding dust
    let operations_amount = available
        .checked_sub(reserve_amount)
        .and_then(|v| v.checked_sub(rewards_amount))
        .ok_or(SavingsError::Underflow)?;

    // Update balances
    treasury.reserve_balance = treasury
        .reserve_balance
        .checked_add(reserve_amount)
        .ok_or(SavingsError::Overflow)?;
    treasury.rewards_balance = treasury
        .rewards_balance
        .checked_add(rewards_amount)
        .ok_or(SavingsError::Overflow)?;
    treasury.operations_balance = treasury
        .operations_balance
        .checked_add(operations_amount)
        .ok_or(SavingsError::Overflow)?;

    // Zero out the unallocated balance
    treasury.treasury_balance = 0;
    validate_treasury_state(&treasury)?;

    // Store the allocation config for reference
    let alloc_config = AllocationConfig {
        reserve_percent,
        rewards_percent,
        operations_percent,
    };
    env.storage()
        .persistent()
        .set(&DataKey::AllocationConfig, &alloc_config);

    set_treasury(env, &treasury);

    env.events().publish(
        (symbol_short!("alloc"),),
        (reserve_amount, rewards_amount, operations_amount),
    );
    env.events().publish(
        (Symbol::new(env, EVENT_TREASURY_ALLOCATED), admin.clone()),
        (
            reserve_amount,
            rewards_amount,
            operations_amount,
            reserve_percent,
            rewards_percent,
            operations_percent,
        ),
    );

    Ok(treasury)
}
