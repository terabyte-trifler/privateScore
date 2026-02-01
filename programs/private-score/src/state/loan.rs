//! ═══════════════════════════════════════════════════════════════════════════
//! LOAN ACCOUNT - Individual loan tracking with health factor
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum LoanStatus {
    #[default]
    Active,
    Repaid,
    Liquidated,
    Defaulted,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum LoanType {
    #[default]
    Standard,
    CreditVerified,
}

#[account]
#[derive(Default)]
pub struct Loan {
    pub borrower: Pubkey,
    pub pool: Pubkey,
    pub principal: u64,
    pub interest_accrued: u64,
    pub amount_repaid: u64,
    pub collateral_locked: u64,
    pub collateral_mint: Pubkey,
    pub collateral_ratio: u16,
    pub interest_rate: u16,
    pub loan_type: LoanType,
    pub status: LoanStatus,
    pub proof_hash: [u8; 32],
    pub credit_commitment: [u8; 32],
    pub created_at: i64,
    pub last_accrual_at: i64,
    pub closed_at: i64,
    pub repayment_count: u16,
    pub repaid_on_time: bool,
    pub duration: i64,
    pub due_date: i64,
    pub _reserved: [u8; 32],
    pub bump: u8,
}

impl Loan {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 32 + 2 + 2 + 1 + 1 + 32 + 32 + 8 + 8 + 8 + 2 + 1 + 8 + 8 + 32 + 1;

    pub fn total_debt(&self) -> u64 {
        self.principal.saturating_add(self.interest_accrued).saturating_sub(self.amount_repaid)
    }

    pub fn outstanding_principal(&self) -> u64 {
        self.principal.saturating_sub(self.amount_repaid.min(self.principal))
    }

    pub fn health_factor(&self, collateral_value_usd: u64, debt_value_usd: u64) -> u64 {
        if debt_value_usd == 0 { return u64::MAX; }
        (collateral_value_usd as u128 * 10000 / debt_value_usd as u128) as u64
    }

    pub fn is_undercollateralized(&self, collateral_value: u64, liquidation_threshold: u16) -> bool {
        let debt = self.total_debt();
        if debt == 0 { return false; }
        let required = (debt as u128 * liquidation_threshold as u128 / 10000) as u64;
        collateral_value < required
    }

    pub fn accrue_interest(&mut self, current_time: i64) -> u64 {
        let elapsed = current_time.saturating_sub(self.last_accrual_at);
        if elapsed <= 0 || self.status != LoanStatus::Active { return 0; }

        let seconds_per_year: i64 = 365 * 24 * 60 * 60;
        let interest = (self.outstanding_principal() as u128
            * self.interest_rate as u128
            * elapsed as u128
            / (seconds_per_year as u128 * 10000)) as u64;

        self.interest_accrued = self.interest_accrued.saturating_add(interest);
        self.last_accrual_at = current_time;
        interest
    }

    pub fn is_overdue(&self, current_time: i64) -> bool {
        self.due_date > 0 && current_time > self.due_date && self.status == LoanStatus::Active
    }

    pub fn is_credit_verified(&self) -> bool {
        self.loan_type == LoanType::CreditVerified
    }

    pub fn collateral_savings(&self, standard_ratio: u16) -> u64 {
        if self.loan_type != LoanType::CreditVerified { return 0; }
        let standard = (self.principal as u128 * standard_ratio as u128 / 10000) as u64;
        standard.saturating_sub(self.collateral_locked)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LoanParams {
    pub amount: u64,
    pub duration: i64,
    pub collateral_amount: u64,
}