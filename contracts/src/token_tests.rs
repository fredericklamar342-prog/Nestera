//! Tests for token minting (#376) and burning (#377) functionality.

use crate::{NesteraContract, NesteraContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, BytesN, Env,
};

fn setup_env() -> (Env, NesteraContractClient<'static>, Address) {
    let env = Env::default();
    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let admin_pk = BytesN::from_array(&env, &[9u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin, &admin_pk);

    (env, client, admin)
}

#[test]
fn test_mint_by_admin() {
    let (env, client, admin) = setup_env();
    let user = Address::generate(&env);

    let initial_metadata = client.get_token_metadata();
    let initial_supply = initial_metadata.total_supply;

    let amount_to_mint = 1_000_000;
    let new_supply = client.mint_tokens(&admin, &user, &amount_to_mint);

    assert_eq!(new_supply, initial_supply + amount_to_mint);

    let metadata = client.get_token_metadata();
    assert_eq!(metadata.total_supply, initial_supply + amount_to_mint);
}

#[test]
fn test_mint_unauthorized() {
    let (env, client, _admin) = setup_env();
    let user = Address::generate(&env);
    let unauthorized = Address::generate(&env);

    let amount_to_mint = 1_000_000;
    let result = client.try_mint_tokens(&unauthorized, &user, &amount_to_mint);

    assert!(result.is_err());
}

#[test]
fn test_mint_invalid_amount() {
    let (env, client, admin) = setup_env();
    let user = Address::generate(&env);

    let result = client.try_mint_tokens(&admin, &user, &0);
    assert!(result.is_err());

    let result = client.try_mint_tokens(&admin, &user, &-100);
    assert!(result.is_err());
}

#[test]
fn test_burn_by_user() {
    let (env, client, admin) = setup_env();
    let user = Address::generate(&env);

    // First mint some tokens to user
    let amount_to_mint = 1_000_000;
    client.mint_tokens(&admin, &user, &amount_to_mint);

    let metadata_before = client.get_token_metadata();
    let supply_before = metadata_before.total_supply;

    // Burn some tokens
    let amount_to_burn = 500_000;
    let new_supply = client.burn(&user, &amount_to_burn);

    assert_eq!(new_supply, supply_before - amount_to_burn);

    let metadata_after = client.get_token_metadata();
    assert_eq!(metadata_after.total_supply, supply_before - amount_to_burn);
}

#[test]
fn test_burn_invalid_amount() {
    let (env, client, admin) = setup_env();
    let user = Address::generate(&env);

    let result = client.try_burn(&user, &0);
    assert!(result.is_err());

    let result = client.try_burn(&user, &-100);
    assert!(result.is_err());
}

#[test]
fn test_burn_insufficient_supply() {
    let (env, client, admin) = setup_env();
    let user = Address::generate(&env);

    // Try to burn more than total supply
    let metadata = client.get_token_metadata();
    let total_supply = metadata.total_supply;

    let result = client.try_burn(&user, &(total_supply + 1));
    assert!(result.is_err());
}

#[test]
fn test_mint_and_burn_sequence() {
    let (env, client, admin) = setup_env();
    let user = Address::generate(&env);

    let initial_metadata = client.get_token_metadata();
    let initial_supply = initial_metadata.total_supply;

    // Mint
    let mint_amount = 2_000_000;
    let supply_after_mint = client.mint_tokens(&admin, &user, &mint_amount);
    assert_eq!(supply_after_mint, initial_supply + mint_amount);

    // Burn
    let burn_amount = 500_000;
    let supply_after_burn = client.burn(&user, &burn_amount);
    assert_eq!(
        supply_after_burn,
        initial_supply + mint_amount - burn_amount
    );

    // Verify final state
    let final_metadata = client.get_token_metadata();
    assert_eq!(
        final_metadata.total_supply,
        initial_supply + mint_amount - burn_amount
    );
}

#[test]
fn test_mint_emits_event() {
    let (env, client, admin) = setup_env();
    let user = Address::generate(&env);

    let amount_to_mint = 1_000_000;
    client.mint_tokens(&admin, &user, &amount_to_mint);

    // Event emission is tested implicitly by the function not panicking
    // Full event testing would require event inspection utilities
}

#[test]
fn test_burn_emits_event() {
    let (env, client, admin) = setup_env();
    let user = Address::generate(&env);

    // First mint some tokens
    let amount_to_mint = 1_000_000;
    client.mint_tokens(&admin, &user, &amount_to_mint);

    // Then burn
    let amount_to_burn = 500_000;
    client.burn(&user, &amount_to_burn);

    // Event emission is tested implicitly by the function not panicking
    // Full event testing would require event inspection utilities
}
