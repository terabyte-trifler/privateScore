//! ═══════════════════════════════════════════════════════════════════════════
//! INITIALIZE POOL - Create a new lending pool
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::LendingPool;
use crate::errors::PrivateScoreError;

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = LendingPool::LEN,
        seeds = [b"pool", pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool: Account<'info, LendingPool>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = pool,
        seeds = [b"vault", pool.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePool>,
    pool_id: u64,
    base_collateral_ratio: u16,
    credit_collateral_ratio: u16,
    interest_rate: u16,
    min_credit_score: u16,
) -> Result<()> {
    require!(base_collateral_ratio >= 10000, PrivateScoreError::InvalidCollateralRatio);
    require!(credit_collateral_ratio >= 10000, PrivateScoreError::InvalidCollateralRatio);
    require!(credit_collateral_ratio <= base_collateral_ratio, PrivateScoreError::InvalidCollateralRatio);
    require!(interest_rate <= 5000, PrivateScoreError::InvalidInterestRate);
    require!(min_credit_score >= 300 && min_credit_score <= 850, PrivateScoreError::InvalidCreditScore);

    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    pool.authority = ctx.accounts.authority.key();
    pool.pool_id = pool_id;
    pool.token_mint = ctx.accounts.token_mint.key();
    pool.vault = ctx.accounts.vault.key();
    pool.base_collateral_ratio = base_collateral_ratio;
    pool.credit_collateral_ratio = credit_collateral_ratio;
    pool.liquidation_threshold = 11000; // 110%
    pool.interest_rate = interest_rate;
    pool.min_credit_score = min_credit_score;
    pool.total_deposits = 0;
    pool.total_borrowed = 0;
    pool.active_loans = 0;
    pool.created_at = clock.unix_timestamp;
    pool.updated_at = clock.unix_timestamp;
    pool.is_active = true;
    pool.accepts_credit_loans = true;
    pool.bump = ctx.bumps.pool;

    msg!("Pool {} initialized with {}% base / {}% credit collateral", 
        pool_id, base_collateral_ratio / 100, credit_collateral_ratio / 100);

    Ok(())
}