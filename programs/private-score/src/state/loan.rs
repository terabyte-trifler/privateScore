use anchor_lang::prelude::*;

/// Individual loan account
#[account]
#[derive(Default)]
pub struct Loan {
    pub borrower: Pubkey,
    pub pool: Pubkey,
    pub principal: u64,
    pub collateral_amount: u64,
    pub interest_accrued: u64,
    pub amount_repaid: u64,
    pub created_at: i64,
    pub last_update: i64,
    pub is_credit_verified: bool,
    pub status: LoanStatus,
    pub credit_tier: u8,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum LoanStatus {
    #[default]
    Active,
    Repaid,
    Liquidated,
    Defaulted,
}

impl Loan {
    pub const SIZE: usize = 8 + 32*2 + 8*6 + 1*4 + 32;
    pub const SEED_PREFIX: &'static [u8] = b"loan";

    pub fn amount_owed(&self) -> u64 {
        self.principal
            .saturating_add(self.interest_accrued)
            .saturating_sub(self.amount_repaid)
    }
}