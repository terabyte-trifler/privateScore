//! ═══════════════════════════════════════════════════════════════════════════
//! GRANT VIEWING ACCESS - Range Protocol selective disclosure for compliance
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use crate::state::{CreditRecord, ViewingKey, AccessLevel, ViewingKeyStatus};
use crate::errors::PrivateScoreError;

#[derive(Accounts)]
#[instruction(viewer: Pubkey)]
pub struct GrantViewingAccess<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"credit", owner.key().as_ref()],
        bump = credit_record.bump,
        constraint = credit_record.owner == owner.key() @ PrivateScoreError::Unauthorized
    )]
    pub credit_record: Account<'info, CreditRecord>,

    #[account(
        init,
        payer = owner,
        space = ViewingKey::LEN,
        seeds = [b"viewing_key", credit_record.key().as_ref(), viewer.as_ref()],
        bump
    )]
    pub viewing_key: Account<'info, ViewingKey>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<GrantViewingAccess>,
    viewer: Pubkey,
    access_level: u8,
    expiry: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    let access = AccessLevel::from_u8(access_level);

    require!(access != AccessLevel::None, PrivateScoreError::InvalidAccessLevel);
    require!(expiry > clock.unix_timestamp, PrivateScoreError::InvalidExpiry);
    require!(expiry <= clock.unix_timestamp + ViewingKey::MAX_EXPIRY, PrivateScoreError::ExpiryTooLong);

    let viewing_key = &mut ctx.accounts.viewing_key;
    viewing_key.owner = ctx.accounts.owner.key();
    viewing_key.viewer = viewer;
    viewing_key.credit_record = ctx.accounts.credit_record.key();
    viewing_key.access_level = access;
    viewing_key.status = ViewingKeyStatus::Active;
    viewing_key.granted_at = clock.unix_timestamp;
    viewing_key.expires_at = expiry;
    viewing_key.last_accessed_at = 0;
    viewing_key.access_count = 0;
    viewing_key.max_accesses = 0; // Unlimited by default
    viewing_key.one_time_use = false;
    viewing_key.notify_on_access = true;
    viewing_key.bump = ctx.bumps.viewing_key;

    // Enable disclosure on credit record
    let credit_record = &mut ctx.accounts.credit_record;
    credit_record.disclosure_enabled = true;

    msg!("Viewing access granted to {} with level {:?}", viewer, access);
    msg!("Expires at: {}", expiry);

    Ok(())
}