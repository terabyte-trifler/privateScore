use anchor_lang::prelude::*;

/// Defines what information a viewer can access
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ViewingScope {
    /// Can only see if score meets a threshold
    ScoreOnly,
    /// Can see score tier and basic loan history
    FullProfile,
    /// Full audit access for regulators
    AuditComplete,
}

/// Grants temporary viewing access to a third party
#[account]
pub struct ViewingKeyGrant {
    /// Owner who granted access
    pub owner: Pubkey,
    
    /// Who is granted access
    pub viewer: Pubkey,
    
    /// Encrypted viewing key
    pub encrypted_key: [u8; 64],
    
    /// What scope of access
    pub scope: ViewingScope,
    
    /// When access was granted
    pub granted_at: i64,
    
    /// When access expires
    pub expires_at: i64,
    
    /// Is this grant still active?
    pub is_active: bool,
    
    /// Bump seed
    pub bump: u8,
}

impl ViewingKeyGrant {
    pub const SPACE: usize = 8 + 32 + 32 + 64 + 1 + 8 + 8 + 1 + 1;
    
    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        current_timestamp > self.expires_at
    }
    
    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        self.is_active && !self.is_expired(current_timestamp)
    }
}