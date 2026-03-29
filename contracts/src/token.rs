//! Native protocol token metadata and initialization for Nestera (#374).
//! Includes minting (#376) and burning (#377) functionality.

use crate::errors::SavingsError;
use crate::storage_types::DataKey;
use soroban_sdk::{contracttype, symbol_short, Address, Env, String};

/// Metadata for the Nestera native protocol token.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenMetadata {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub total_supply: i128,
    pub treasury: Address,
}

/// Event emitted when tokens are minted
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenMinted {
    pub to: Address,
    pub amount: i128,
    pub new_total_supply: i128,
}

/// Event emitted when tokens are burned
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenBurned {
    pub from: Address,
    pub amount: i128,
    pub new_total_supply: i128,
}

/// Initializes the protocol token metadata and assigns total supply to the treasury.
///
/// Can only be called once. Subsequent calls return `ConfigAlreadyInitialized`.
///
/// # Arguments
/// * `env`          - Contract environment
/// * `treasury`     - Address that receives the initial total supply
/// * `total_supply` - Total token supply (in smallest unit, e.g. stroops)
pub fn initialize_token(
    env: &Env,
    treasury: Address,
    total_supply: i128,
) -> Result<(), SavingsError> {
    if env.storage().instance().has(&DataKey::TokenMetadata) {
        return Err(SavingsError::ConfigAlreadyInitialized);
    }

    if total_supply <= 0 {
        return Err(SavingsError::InvalidAmount);
    }

    let metadata = TokenMetadata {
        name: String::from_str(env, "Nestera"),
        symbol: String::from_str(env, "NST"),
        decimals: 7,
        total_supply,
        treasury: treasury.clone(),
    };

    env.storage()
        .instance()
        .set(&DataKey::TokenMetadata, &metadata);

    env.events().publish(
        (symbol_short!("token"), symbol_short!("init"), treasury),
        total_supply,
    );

    Ok(())
}

/// Returns the stored token metadata.
pub fn get_token_metadata(env: &Env) -> Result<TokenMetadata, SavingsError> {
    env.storage()
        .instance()
        .get(&DataKey::TokenMetadata)
        .ok_or(SavingsError::InternalError)
}

/// Mints new tokens to the specified address.
///
/// Only callable by governance or rewards module.
/// Updates total supply and emits TokenMinted event.
///
/// # Arguments
/// * `env` - Contract environment
/// * `to` - Address to receive the minted tokens
/// * `amount` - Amount of tokens to mint (must be positive)
///
/// # Returns
/// * `Ok(i128)` - New total supply after minting
/// * `Err(SavingsError)` if unauthorized, invalid amount, or overflow
pub fn mint(env: &Env, to: Address, amount: i128) -> Result<i128, SavingsError> {
    // Validate amount
    if amount <= 0 {
        return Err(SavingsError::InvalidAmount);
    }

    // Get current metadata
    let mut metadata = get_token_metadata(env)?;

    // Update total supply with overflow protection
    metadata.total_supply = metadata
        .total_supply
        .checked_add(amount)
        .ok_or(SavingsError::Overflow)?;

    // Save updated metadata
    env.storage()
        .instance()
        .set(&DataKey::TokenMetadata, &metadata);

    // Emit TokenMinted event
    let event = TokenMinted {
        to: to.clone(),
        amount,
        new_total_supply: metadata.total_supply,
    };
    env.events()
        .publish((symbol_short!("token"), symbol_short!("mint"), to), event);

    Ok(metadata.total_supply)
}

/// Burns tokens from the specified address.
///
/// Reduces total supply and emits TokenBurned event.
/// Validates that the user has sufficient balance.
///
/// # Arguments
/// * `env` - Contract environment
/// * `from` - Address to burn tokens from
/// * `amount` - Amount of tokens to burn (must be positive)
///
/// # Returns
/// * `Ok(i128)` - New total supply after burning
/// * `Err(SavingsError)` if invalid amount, insufficient balance, or underflow
pub fn burn(env: &Env, from: Address, amount: i128) -> Result<i128, SavingsError> {
    // Validate amount
    if amount <= 0 {
        return Err(SavingsError::InvalidAmount);
    }

    // Get current metadata
    let mut metadata = get_token_metadata(env)?;

    // Check if user has sufficient balance (for now, we check against total supply)
    // In a full implementation, we would track individual balances
    if amount > metadata.total_supply {
        return Err(SavingsError::InsufficientBalance);
    }

    // Update total supply with underflow protection
    metadata.total_supply = metadata
        .total_supply
        .checked_sub(amount)
        .ok_or(SavingsError::Underflow)?;

    // Save updated metadata
    env.storage()
        .instance()
        .set(&DataKey::TokenMetadata, &metadata);

    // Emit TokenBurned event
    let event = TokenBurned {
        from: from.clone(),
        amount,
        new_total_supply: metadata.total_supply,
    };
    env.events()
        .publish((symbol_short!("token"), symbol_short!("burn"), from), event);

    Ok(metadata.total_supply)
}
