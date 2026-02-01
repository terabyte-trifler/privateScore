//! ═══════════════════════════════════════════════════════════════════════════
//! UPDATE CREDIT - Update an existing credit commitment
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use crate::state::{CreditRecord, CreditTier};
use crate::errors::PrivateScoreError;

#[derive(Accounts)]
pub struct UpdateCredit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"credit", owner.key().as_ref()],
        bump = credit_record.bump,
        constraint = credit_record.owner == owner.key() @ PrivateScoreError::Unauthorized
    )]
    pub credit_record: Account<'info, CreditRecord>,
}

pub fn handler(
    ctx: Context<UpdateCredit>,
    new_commitment: [u8; 32],
    new_tier: u8,
) -> Result<()> {
    require!(new_commitment != [0u8; 32], PrivateScoreError::InvalidCommitment);

    let credit_record = &mut ctx.accounts.credit_record;
    let clock = Clock::get()?;
    let tier_enum = CreditTier::from_u8(new_tier);

    credit_record.update_commitment(new_commitment, tier_enum, clock.unix_timestamp);

    msg!("Credit commitment updated for {}", ctx.accounts.owner.key());
    msg!("New tier: {:?}, New nonce: {}", tier_enum, credit_record.nonce);

    Ok(())
}