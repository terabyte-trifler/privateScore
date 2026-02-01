//! ═══════════════════════════════════════════════════════════════════════════
//! DEPOSIT - Lender deposits funds into the pool
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::LendingPool;
use crate::errors::PrivateScoreError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,

    #[account(
        mut,
        constraint = pool.is_active @ PrivateScoreError::PoolInactive
    )]
    pub pool: Account<'info, LendingPool>,

    #[account(
        mut,
        constraint = lender_token_account.mint == pool.token_mint @ PrivateScoreError::InvalidTokenMint
    )]
    pub lender_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault.key() == pool.vault @ PrivateScoreError::InvalidVault
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, PrivateScoreError::InvalidAmount);

    let cpi_accounts = Transfer {
        from: ctx.accounts.lender_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.lender.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    let pool = &mut ctx.accounts.pool;
    pool.total_deposits = pool.total_deposits.saturating_add(amount);
    pool.updated_at = Clock::get()?.unix_timestamp;

    msg!("Deposited {} tokens into pool {}", amount, pool.pool_id);
    Ok(())
}