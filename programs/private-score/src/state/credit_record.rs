//! ═══════════════════════════════════════════════════════════════════════════
//! CREDIT RECORD - Pedersen commitment storage, tier tracking
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum CreditTier {
    #[default]
    Unknown,
    Poor,       // 300-579
    Fair,       // 580-669
    Good,       // 670-739
    VeryGood,   // 740-799
    Excellent,  // 800-850
}

impl CreditTier {
    pub fn min_score(&self) -> u16 {
        match self {
            CreditTier::Unknown => 0,
            CreditTier::Poor => 300,
            CreditTier::Fair => 580,
            CreditTier::Good => 670,
            CreditTier::VeryGood => 740,
            CreditTier::Excellent => 800,
        }
    }

    pub fn from_u8(value: u8) -> Self {
        match value {
            1 => CreditTier::Poor,
            2 => CreditTier::Fair,
            3 => CreditTier::Good,
            4 => CreditTier::VeryGood,
            5 => CreditTier::Excellent,
            _ => CreditTier::Unknown,
        }
    }

    pub fn qualifies_for_reduced_collateral(&self) -> bool {
        matches!(self, CreditTier::Good | CreditTier::VeryGood | CreditTier::Excellent)
    }
}

#[account]
#[derive(Default)]
pub struct CreditRecord {
    pub owner: Pubkey,
    pub commitment: [u8; 32],       // Hash(score || salt)
    pub tier: CreditTier,
    pub nonce: u64,
    pub registered_at: i64,
    pub updated_at: i64,
    pub expires_at: i64,
    pub proofs_verified: u32,
    pub loans_taken: u32,
    pub total_borrowed: u64,
    pub total_repaid: u64,
    pub on_time_repayments: u32,
    pub late_repayments: u32,
    pub is_active: bool,
    pub disclosure_enabled: bool,
    pub is_compressed: bool,
    pub merkle_tree: Pubkey,
    pub _reserved: [u8; 32],
    pub bump: u8,
}

impl CreditRecord {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 4 + 4 + 8 + 8 + 4 + 4 + 1 + 1 + 1 + 32 + 32 + 1;
    pub const DEFAULT_EXPIRY_DURATION: i64 = 30 * 24 * 60 * 60;

    pub fn is_expired(&self, current_time: i64) -> bool {
        self.expires_at > 0 && current_time > self.expires_at
    }

    pub fn can_borrow(&self, current_time: i64) -> bool {
        self.is_active && !self.is_expired(current_time)
    }

    pub fn increment_nonce(&mut self) {
        self.nonce = self.nonce.saturating_add(1);
    }

    pub fn repayment_ratio(&self) -> u16 {
        let total = self.on_time_repayments + self.late_repayments;
        if total == 0 { return 10000; }
        ((self.on_time_repayments as u32 * 10000) / total) as u16
    }

    pub fn update_commitment(&mut self, new_commitment: [u8; 32], new_tier: CreditTier, current_time: i64) {
        self.commitment = new_commitment;
        self.tier = new_tier;
        self.updated_at = current_time;
        self.expires_at = current_time + Self::DEFAULT_EXPIRY_DURATION;
        self.increment_nonce();
    }

    pub fn record_loan(&mut self, amount: u64) {
        self.loans_taken = self.loans_taken.saturating_add(1);
        self.total_borrowed = self.total_borrowed.saturating_add(amount);
    }

    pub fn record_repayment(&mut self, amount: u64, on_time: bool) {
        self.total_repaid = self.total_repaid.saturating_add(amount);
        if on_time {
            self.on_time_repayments = self.on_time_repayments.saturating_add(1);
        } else {
            self.late_repayments = self.late_repayments.saturating_add(1);
        }
    }
}