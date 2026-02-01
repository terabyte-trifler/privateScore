use anchor_lang::prelude::*;

#[account]
pub struct LendingPool {
    /// Pool authority (admin)
    pub authority: Pubkey,
    
    /// Pool name for display
    pub name: String,
    
    /// Token mint for loans (e.g., USDC)
    pub loan_mint: Pubkey,
    
    /// Token mint for collateral (e.g., SOL)
    pub collateral_mint: Pubkey,
    
    /// Vault holding loan tokens
    pub loan_vault: Pubkey,
    
    /// Vault holding collateral
    pub collateral_vault: Pubkey,
    
    /// Base collateral ratio in bps (e.g., 15000 = 150%)
    pub base_collateral_ratio: u16,
    
    /// Reduced ratio for credit-verified borrowers (e.g., 12000 = 120%)
    pub credit_verified_collateral_ratio: u16,
    
    /// Interest rate in basis points (e.g., 500 = 5%)
    pub interest_rate_bps: u16,
    
    /// Minimum credit score for reduced collateral
    pub min_credit_score: u16,
    
    /// Maximum debt-to-income ratio in bps
    pub max_dti_ratio: u16,
    
    /// Total deposits in the pool
    pub total_deposits: u64,
    
    /// Total amount currently borrowed
    pub total_borrowed: u64,
    
    /// Total collateral locked
    pub total_collateral: u64,
    
    /// Number of active loans
    pub active_loans: u32,
    
    /// Next loan ID
    pub next_loan_id: u64,
    
    /// Pool active status
    pub is_active: bool,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl LendingPool {
    pub const MAX_NAME_LENGTH: usize = 32;
    pub const SPACE: usize = 8 + 32 + (4 + Self::MAX_NAME_LENGTH) + 32 * 4 + 
                                  2 * 5 + 8 * 4 + 4 + 1 + 1;
    
    pub fn available_liquidity(&self) -> u64 {
        self.total_deposits.saturating_sub(self.total_borrowed)
    }
    
    pub fn utilization_rate(&self) -> u64 {
        if self.total_deposits == 0 {
            return 0;
        }
        (self.total_borrowed * 10000) / self.total_deposits
    }
    
    pub fn get_required_collateral(&self, amount: u64, is_credit_verified: bool) -> u64 {
        let ratio = if is_credit_verified {
            self.credit_verified_collateral_ratio
        } else {
            self.base_collateral_ratio
        };
        (amount * ratio as u64) / 10000
    }
}