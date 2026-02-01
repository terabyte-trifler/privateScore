//! ═══════════════════════════════════════════════════════════════════════════
//! VIEWING KEY - Range Protocol selective disclosure for compliance
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use crate::errors::PrivateScoreError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum AccessLevel {
    #[default]
    None,
    TierOnly,           // Level 1: Just tier (Good/Fair/etc)
    BasicHistory,       // Level 2: Tier + loan history summary
    FullAccess,         // Level 3: Full credit record
    RegulatoryAccess,   // Level 4: Everything including PII
}

impl AccessLevel {
    pub fn from_u8(value: u8) -> Self {
        match value {
            1 => AccessLevel::TierOnly,
            2 => AccessLevel::BasicHistory,
            3 => AccessLevel::FullAccess,
            4 => AccessLevel::RegulatoryAccess,
            _ => AccessLevel::None,
        }
    }

    pub fn to_u8(&self) -> u8 {
        match self {
            AccessLevel::None => 0,
            AccessLevel::TierOnly => 1,
            AccessLevel::BasicHistory => 2,
            AccessLevel::FullAccess => 3,
            AccessLevel::RegulatoryAccess => 4,
        }
    }

    pub fn can_view_tier(&self) -> bool {
        !matches!(self, AccessLevel::None)
    }

    pub fn can_view_history(&self) -> bool {
        matches!(self, AccessLevel::BasicHistory | AccessLevel::FullAccess | AccessLevel::RegulatoryAccess)
    }

    pub fn can_view_full(&self) -> bool {
        matches!(self, AccessLevel::FullAccess | AccessLevel::RegulatoryAccess)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum ViewingKeyStatus {
    #[default]
    Active,
    Revoked,
    Expired,
    Suspended,
}

#[account]
#[derive(Default)]
pub struct ViewingKey {
    pub owner: Pubkey,
    pub viewer: Pubkey,
    pub credit_record: Pubkey,
    pub access_level: AccessLevel,
    pub status: ViewingKeyStatus,
    pub granted_at: i64,
    pub expires_at: i64,
    pub last_accessed_at: i64,
    pub access_count: u32,
    pub max_accesses: u32,
    pub purpose: [u8; 32],
    pub encrypted_key: [u8; 64],
    pub key_nonce: [u8; 12],
    pub one_time_use: bool,
    pub notify_on_access: bool,
    pub access_restriction: [u8; 32],
    pub _reserved: [u8; 32],
    pub bump: u8,
}

impl ViewingKey {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 4 + 4 + 32 + 64 + 12 + 1 + 1 + 32 + 32 + 1;
    pub const DEFAULT_EXPIRY: i64 = 7 * 24 * 60 * 60;
    pub const MAX_EXPIRY: i64 = 365 * 24 * 60 * 60;

    pub fn is_valid(&self, current_time: i64) -> bool {
        self.status == ViewingKeyStatus::Active
            && !self.is_expired(current_time)
            && !self.is_access_exhausted()
    }

    pub fn is_expired(&self, current_time: i64) -> bool {
        self.expires_at > 0 && current_time > self.expires_at
    }

    pub fn is_access_exhausted(&self) -> bool {
        self.max_accesses > 0 && self.access_count >= self.max_accesses
    }

    pub fn record_access(&mut self, current_time: i64) -> Result<()> {
        require!(self.is_valid(current_time), PrivateScoreError::InvalidViewingKey);
        self.access_count = self.access_count.saturating_add(1);
        self.last_accessed_at = current_time;

        if self.one_time_use || self.is_access_exhausted() {
            self.status = ViewingKeyStatus::Expired;
        }
        Ok(())
    }

    pub fn revoke(&mut self) {
        self.status = ViewingKeyStatus::Revoked;
    }

    pub fn remaining_accesses(&self) -> Option<u32> {
        if self.max_accesses == 0 { None }
        else { Some(self.max_accesses.saturating_sub(self.access_count)) }
    }

    pub fn time_remaining(&self, current_time: i64) -> i64 {
        self.expires_at.saturating_sub(current_time).max(0)
    }

    pub fn extend_expiry(&mut self, additional_seconds: i64) {
        let new_expiry = self.expires_at.saturating_add(additional_seconds);
        let max_allowed = self.granted_at + Self::MAX_EXPIRY;
        self.expires_at = new_expiry.min(max_allowed);
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DisclosureRequest {
    pub viewer: Pubkey,
    pub access_level: AccessLevel,
    pub purpose: [u8; 32],
    pub requested_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DisclosureResponse {
    pub disclosed_at: i64,
    pub tier_disclosed: bool,
    pub history_disclosed: bool,
    pub full_access_granted: bool,
}