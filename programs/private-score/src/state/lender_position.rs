use anchor_lang::prelude::*;

/// Lender's position in a lending pool
#[account]
#[derive(Default)]
pub struct LenderPosition {
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub deposited_amount: u64,
    pub pool_share_bps: u64,
    pub interest_earned: u64,
    pub interest_withdrawn: u64,
    pub created_at: i64,
    pub last_update: i64,
    pub bump: u8,
}

impl LenderPosition {
    pub const SIZE: usize = 8 + 32*2 + 8*6 + 1 + 32;
    pub const SEED_PREFIX: &'static [u8] = b"lender_position";
}