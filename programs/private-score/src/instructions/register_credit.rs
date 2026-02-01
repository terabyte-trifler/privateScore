//! ═══════════════════════════════════════════════════════════════════════════
//! REGISTER CREDIT - Register a new credit commitment on-chain
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use crate::state::{CreditRecord, CreditTier};
use crate::errors::PrivateScoreError;

#[derive(Accounts)]
pub struct RegisterCredit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = CreditRecord::LEN,
        seeds = [b"credit", owner.key().as_ref()],
        bump
    )]
    pub credit_record: Account<'info, CreditRecord>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterCredit>,
    commitment: [u8; 32],
    tier: u8,
) -> Result<()> {
    // Validate commitment is not empty
    require!(commitment != [0u8; 32], PrivateScoreError::InvalidCommitment);
    
    let tier_enum = CreditTier::from_u8(tier);
    let clock = Clock::get()?;

    let credit_record = &mut ctx.accounts.credit_record;
    credit_record.owner = ctx.accounts.owner.key();
    credit_record.commitment = commitment;
    credit_record.tier = tier_enum;
    credit_record.nonce = 1;
    credit_record.registered_at = clock.unix_timestamp;
    credit_record.updated_at = clock.unix_timestamp;
    credit_record.expires_at = clock.unix_timestamp + CreditRecord::DEFAULT_EXPIRY_DURATION;
    credit_record.proofs_verified = 0;
    credit_record.loans_taken = 0;
    credit_record.total_borrowed = 0;
    credit_record.total_repaid = 0;
    credit_record.on_time_repayments = 0;
    credit_record.late_repayments = 0;
    credit_record.is_active = true;
    credit_record.disclosure_enabled = false;
    credit_record.is_compressed = false;
    credit_record.bump = ctx.bumps.credit_record;

    msg!("Credit commitment registered for {}", ctx.accounts.owner.key());
    msg!("Tier: {:?}, Expires: {}", tier_enum, credit_record.expires_at);

    Ok(())
}