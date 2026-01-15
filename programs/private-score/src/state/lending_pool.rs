use anchor_lang::prelude::*;

/// Lending pool configuration and state
#[account]
#[derive(Default)]
pub struct LendingPool {
    /// Pool authority (admin)
    pub authority: Pubkey,
    
    /// Token mint for the pool (e.g., USDC)
    pub token_mint: Pubkey,
    
    /// Pool's token vault
    pub token_vault: Pubkey,
    
    /// Collateral token vault
    pub collateral_vault: Pubkey,
    
    /// Total deposits in the pool
    pub total_deposits: u64,
    
    /// Total active borrows
    pub total_borrows: u64,
    
    /// Total collateral locked
    pub total_collateral: u64,
    
    /// Collateral ratio for non-verified borrowers (basis points)
    /// e.g., 15000 = 150%
    pub base_collateral_ratio: u64,
    
    /// Reduced ratio for credit-verified borrowers
    /// e.g., 12000 = 120%
    pub credit_collateral_ratio: u64,
    
    /// Annual interest rate in basis points
    pub interest_rate_bps: u64,
    
    /// Total loans originated (counter)
    pub loans_originated: u64,
    
    /// Total loans repaid successfully
    pub loans_repaid: u64,
    
    /// Pool creation timestamp
    pub created_at: i64,
    
    /// Last update timestamp
    pub last_update: i64,
    
    /// Is pool active for new loans
    pub is_active: bool,
    
    /// PDA bump seed
    pub bump: u8,
}

impl LendingPool {
    pub const SIZE: usize = 8 + 32*4 + 8*9 + 1 + 1 + 64;
    pub const SEED_PREFIX: &'static [u8] = b"lending_pool";

    /// Calculate required collateral for a given borrow amount
    pub fn calculate_collateral(&self, amount: u64, is_credit_verified: bool) -> Option<u64> {
        let ratio = if is_credit_verified {
            self.credit_collateral_ratio
        } else {
            self.base_collateral_ratio
        };
        
        amount.checked_mul(ratio)?.checked_div(10000)
    }

    /// Check if pool has sufficient liquidity
    pub fn has_liquidity(&self, amount: u64) -> bool {
        self.total_deposits.saturating_sub(self.total_borrows) >= amount
    }
}