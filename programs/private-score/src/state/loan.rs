use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LoanStatus {
    Active,
    Repaid,
    Liquidated,
    Defaulted,
}

#[account]
pub struct Loan {
    /// The lending pool this loan belongs to
    pub pool: Pubkey,
    
    /// Borrower's wallet
    pub borrower: Pubkey,
    
    /// Unique loan ID within the pool
    pub loan_id: u64,
    
    /// Original principal amount
    pub principal: u64,
    
    /// Collateral amount locked
    pub collateral_amount: u64,
    
    /// Interest rate at time of borrowing (bps)
    pub interest_rate_bps: u16,
    
    /// Accrued interest
    pub accrued_interest: u64,
    
    /// Was this loan obtained with ZK credit verification?
    pub is_credit_verified: bool,
    
    /// Timestamp when loan was created
    pub created_at: i64,
    
    /// Last interest accrual timestamp
    pub last_accrual_timestamp: i64,
    
    /// Current loan status
    pub status: LoanStatus,
    
    /// Bump seed
    pub bump: u8,
}

impl Loan {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 2 + 8 + 1 + 8 + 8 + 1 + 1 + 32;
    
    /// Calculate total debt (principal + interest)
    pub fn total_debt(&self) -> u64 {
        self.principal.saturating_add(self.accrued_interest)
    }
    
    /// Calculate health factor (collateral / debt) in bps
    pub fn health_factor(&self) -> u64 {
        let debt = self.total_debt();
        if debt == 0 {
            return u64::MAX;
        }
        (self.collateral_amount * 10000) / debt
    }
    
    /// Check if loan can be liquidated
    pub fn is_liquidatable(&self) -> bool {
        self.status == LoanStatus::Active && self.health_factor() < 10000
    }
    
    /// Accrue interest based on time elapsed
    pub fn accrue_interest(&mut self, current_timestamp: i64) -> u64 {
        let seconds_elapsed = (current_timestamp - self.last_accrual_timestamp) as u64;
        let seconds_per_year: u64 = 365 * 24 * 60 * 60;
        
        let interest = (self.principal * self.interest_rate_bps as u64 * seconds_elapsed)
            / (seconds_per_year * 10000);
        
        self.accrued_interest = self.accrued_interest.saturating_add(interest);
        self.last_accrual_timestamp = current_timestamp;
        
        interest
    }