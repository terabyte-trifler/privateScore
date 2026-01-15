use anchor_lang::prelude::*;

/// User's credit record storing their commitment and verification history
#[account]
#[derive(Default)]
pub struct CreditRecord {
    pub owner: Pubkey,
    
    /// Pedersen commitment: hash(score || salt)
    pub score_commitment: [u8; 32],
    
    /// Credit tier (1-5)
    /// 1 = Poor (300-579)
    /// 2 = Fair (580-669)
    /// 3 = Good (670-739)
    /// 4 = Very Good (740-799)
    /// 5 = Excellent (800-850)
    pub tier: u8,
    
    pub proofs_submitted: u64,
    pub loans_repaid: u64,
    pub loans_defaulted: u64,
    pub last_verified: i64,
    pub created_at: i64,
    pub last_update: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl CreditRecord {
    pub const SIZE: usize = 8 + 32 + 32 + 1 + 8*5 + 1*2 + 32;
    pub const SEED_PREFIX: &'static [u8] = b"credit_record";

    pub fn tier_name(&self) -> &'static str {
        match self.tier {
            1 => "Poor",
            2 => "Fair",
            3 => "Good",
            4 => "Very Good",
            5 => "Excellent",
            _ => "Unknown",
        }
    }
}