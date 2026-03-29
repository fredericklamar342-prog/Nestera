//! Storage types for staking mechanism (#442).

use soroban_sdk::{contracttype, Address};

/// Represents a user's stake in the protocol
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Stake {
    /// Amount of tokens staked
    pub amount: i128,
    /// Timestamp when the stake was created
    pub start_time: u64,
    /// Timestamp when the stake was last updated
    pub last_update_time: u64,
    /// Accumulated rewards per share at last update
    pub reward_per_share: i128,
}

/// Staking configuration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StakingConfig {
    /// Minimum amount required to stake
    pub min_stake_amount: i128,
    /// Maximum amount that can be staked per user
    pub max_stake_amount: i128,
    /// Reward rate in basis points (e.g., 500 = 5% APY)
    pub reward_rate_bps: u32,
    /// Whether staking is enabled
    pub enabled: bool,
    /// Lock period in seconds (0 = no lock)
    pub lock_period_seconds: u64,
}

/// Storage keys for staking module
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StakingDataKey {
    /// Staking configuration
    Config,
    /// User's stake (maps user address to Stake)
    UserStake(Address),
    /// Total staked amount across all users
    TotalStaked,
    /// Accumulated rewards per staked token
    RewardPerToken,
    /// Last update timestamp for reward calculation
    LastUpdateTime,
    /// Total rewards distributed
    TotalRewardsDistributed,
    /// List of all stakers (for tracking)
    AllStakers,
}

/// Event emitted when a user stakes tokens
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StakeCreated {
    pub user: Address,
    pub amount: i128,
    pub total_staked: i128,
}

/// Event emitted when a user unstakes tokens
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StakeWithdrawn {
    pub user: Address,
    pub amount: i128,
    pub total_staked: i128,
}

/// Event emitted when staking rewards are claimed
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StakingRewardsClaimed {
    pub user: Address,
    pub amount: i128,
}
