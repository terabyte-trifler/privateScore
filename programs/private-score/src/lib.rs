use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("7EQoGy3JbVLqKL6Rn4Mx678nCAPhyRzydzpzCA8W29kV");

#[program]
pub mod privatescore {
    use super::*;

    // Pool Management
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        name: String,
        base_collateral_ratio: u16,
        credit_collateral_ratio: u16,
        interest_rate_bps: u16,
        min_credit_score: u16,
        max_dti_ratio: u16,
    ) -> Result<()> {
        instructions::initialize_pool::handler(
            ctx, name, base_collateral_ratio, credit_collateral_ratio,
            interest_rate_bps, min_credit_score, max_dti_ratio,
        )
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    // Credit Management
    pub fn register_credit(
        ctx: Context<RegisterCredit>,
        score_commitment: [u8; 32],
        tier: u8,
    ) -> Result<()> {
        instructions::register_credit::handler(ctx, score_commitment, tier)
    }

    pub fn update_credit(
        ctx: Context<UpdateCredit>,
        new_commitment: [u8; 32],
        new_tier: u8,
    ) -> Result<()> {
        instructions::update_credit::handler(ctx, new_commitment, new_tier)
    }

    // Borrowing - THE CORE FUNCTIONALITY
    pub fn verify_and_borrow(
        ctx: Context<VerifyAndBorrow>,
        amount: u64,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
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

    // Range Compliance - Selective Disclosure
    pub fn grant_viewing_access(
        ctx: Context<GrantViewingAccess>,
        viewer: Pubkey,
        scope: ViewingScope,
        duration_seconds: i64,
    ) -> Result<()> {
        instructions::grant_viewing_access::handler(ctx, viewer, scope, duration_seconds)
    }

    pub fn revoke_viewing_access(ctx: Context<RevokeViewingAccess>) -> Result<()> {
        instructions::revoke_viewing_access::handler(ctx)
    }
}
