use anchor_lang::prelude::*;

#[account]
pub struct CreditRecord {
    /// Owner of this credit record
    pub owner: Pubkey,
    
    /// Pedersen commitment of the credit score
    /// commitment = Pedersen(score || salt)
    pub score_commitment: [u8; 32],
    
    /// Credit tier (1-5) for quick classification
    /// 1: Poor (300-579), 2: Fair (580-669), 3: Good (670-739)
    /// 4: Very Good (740-799), 5: Excellent (800-850)
    pub tier: u8,
    
    /// Nonce for replay protection
    pub nonce: u64,
    
    /// When this commitment was registered
    pub registered_at: i64,
    
    /// When this commitment expires (30 days default)
    pub expires_at: i64,
    
    /// Number of successful verifications
    pub verification_count: u32,
    
    /// Last successful verification timestamp
    pub last_verified_at: i64,
    
    /// Is this record active?
    pub is_active: bool,
    
    /// Bump seed
    pub bump: u8,
}

impl CreditRecord {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 8 + 8 + 8 + 4 + 8 + 1 + 1;
    pub const DEFAULT_EXPIRATION_SECONDS: i64 = 30 * 24 * 60 * 60; // 30 days
    
    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        current_timestamp > self.expires_at
    }
    
    pub fn increment_nonce(&mut self) {
        self.nonce = self.nonce.saturating_add(1);
    }
}