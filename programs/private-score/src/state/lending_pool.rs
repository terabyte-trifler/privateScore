//! ═══════════════════════════════════════════════════════════════════════════
//! LENDING POOL ACCOUNT
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct LendingPool {
    pub authority: Pubkey,
    pub pool_id: u64,
    pub token_mint: Pubkey,
    pub vault: Pubkey,
    pub base_collateral_ratio: u16,      // 15000 = 150%
    pub credit_collateral_ratio: u16,    // 12000 = 120%
    pub liquidation_threshold: u16,      // 11000 = 110%
    pub interest_rate: u16,              // 500 = 5% APY
    pub min_credit_score: u16,           // 650 default
    pub total_deposits: u64,
    pub total_borrowed: u64,
    pub active_loans: u32,
    pub total_interest_accrued: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_active: bool,
    pub accepts_credit_loans: bool,
    pub _reserved: [u8; 64],
    pub bump: u8,
}

impl LendingPool {
    pub const LEN: usize = 8 + 32 + 8 + 32 + 32 + 2 + 2 + 2 + 2 + 2 + 8 + 8 + 4 + 8 + 8 + 8 + 1 + 1 + 64 + 1;

    pub fn available_liquidity(&self) -> u64 {
        self.total_deposits.saturating_sub(self.total_borrowed)
    }

    pub fn utilization_rate(&self) -> u16 {
        if self.total_deposits == 0 { return 0; }
        ((self.total_borrowed as u128 * 10000) / self.total_deposits as u128) as u16
    }

    pub fn get_collateral_ratio(&self, is_credit_verified: bool) -> u16 {
        if is_credit_verified && self.accepts_credit_loans {
            self.credit_collateral_ratio
        } else {
            self.base_collateral_ratio
        }
    }

    pub fn has_liquidity(&self, amount: u64) -> bool {
        self.available_liquidity() >= amount
    }

    pub fn collateral_savings_bps(&self) -> u16 {
        self.base_collateral_ratio.saturating_sub(self.credit_collateral_ratio)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct PoolStats {
    pub total_volume: u64,
    pub total_loans_issued: u64,
    pub total_credit_loans: u64,
    pub average_loan_size: u64,
    pub total_liquidations: u32,
}