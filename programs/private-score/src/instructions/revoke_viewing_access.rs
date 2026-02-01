//! ═══════════════════════════════════════════════════════════════════════════
//! REVOKE VIEWING ACCESS - Revoke previously granted viewing access
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use crate::state::{ViewingKey, ViewingKeyStatus};
use crate::errors::PrivateScoreError;

#[derive(Accounts)]
pub struct RevokeViewingAccess<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        constraint = viewing_key.owner == owner.key() @ PrivateScoreError::Unauthorized,
        constraint = viewing_key.status == ViewingKeyStatus::Active @ PrivateScoreError::ViewingKeyNotActive
    )]
    pub viewing_key: Account<'info, ViewingKey>,
}

pub fn handler(ctx: Context<RevokeViewingAccess>) -> Result<()> {
    let viewing_key = &mut ctx.accounts.viewing_key;
    let viewer = viewing_key.viewer;

    viewing_key.revoke();

    msg!("Viewing access revoked for {}", viewer);
    msg!("Total accesses before revocation: {}", viewing_key.access_count);

    Ok(())
}