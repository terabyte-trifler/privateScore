//! ═══════════════════════════════════════════════════════════════════════════
//! PRIVATESCORE - Privacy-Preserving Credit Scoring on Solana
//! ═══════════════════════════════════════════════════════════════════════════
//!
//! A DeFi lending protocol that uses zero-knowledge proofs to enable
//! reduced collateral borrowing while preserving user privacy.
//!
//! Key Features:
//! - ZK-verified credit scores (Noir proofs via Sunspot)
//! - Reduced collateral for creditworthy borrowers (120% vs 150%)
//! - Compressed credit commitments (Light Protocol)
//! - Selective disclosure for compliance (Range Protocol)

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("PSCore1111111111111111111111111111111111111");

#[program]
pub mod privatescore {
    use super::*;

    // ═══════════════════════════════════════════════════════════════════════
    // POOL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        pool_id: u64,
        base_collateral_ratio: u16,
        credit_collateral_ratio: u16,
        interest_rate: u16,
        min_credit_score: u16,
    ) -> Result<()> {
        instructions::initialize_pool::handler(ctx, pool_id, base_collateral_ratio, credit_collateral_ratio, interest_rate, min_credit_score)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CREDIT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    pub fn register_credit(ctx: Context<RegisterCredit>, commitment: [u8; 32], tier: u8) -> Result<()> {
        instructions::register_credit::handler(ctx, commitment, tier)
    }

    pub fn update_credit(ctx: Context<UpdateCredit>, new_commitment: [u8; 32], new_tier: u8) -> Result<()> {
        instructions::update_credit::handler(ctx, new_commitment, new_tier)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BORROWING OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════

    pub fn verify_and_borrow(ctx: Context<VerifyAndBorrow>, amount: u64, proof: Vec<u8>, public_inputs: Vec<u8>) -> Result<()> {
        instructions::verify_and_borrow::handler(ctx, amount, proof, public_inputs)
    }

    pub fn borrow_standard(ctx: Context<BorrowStandard>, amount: u64) -> Result<()> {
        instructions::borrow_standard::handler(ctx, amount)
    }

    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        instructions::repay::handler(ctx, amount)
    }

    pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
        instructions::liquidate::handler(ctx)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RANGE PROTOCOL - SELECTIVE DISCLOSURE
    // ═══════════════════════════════════════════════════════════════════════

    pub fn grant_viewing_access(ctx: Context<GrantViewingAccess>, viewer: Pubkey, access_level: u8, expiry: i64) -> Result<()> {
        instructions::grant_viewing_access::handler(ctx, viewer, access_level, expiry)
    }

    pub fn revoke_viewing_access(ctx: Context<RevokeViewingAccess>) -> Result<()> {
        instructions::revoke_viewing_access::handler(ctx)
    }
}