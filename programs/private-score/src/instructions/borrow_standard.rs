//! ═══════════════════════════════════════════════════════════════════════════
//! BORROW STANDARD - Standard borrowing without credit verification (150%)
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{LendingPool, Loan, LoanType, LoanStatus};
use crate::errors::PrivateScoreError;

#[derive(Accounts)]
pub struct BorrowStandard<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        mut,
        constraint = pool.is_active @ PrivateScoreError::PoolInactive
    )]
    pub pool: Account<'info, LendingPool>,

    #[account(
        init,
        payer = borrower,
        space = Loan::LEN,
        seeds = [b"loan", pool.key().as_ref(), borrower.key().as_ref(), &pool.active_loans.to_le_bytes()],
        bump
    )]
    pub loan: Account<'info, Loan>,

    #[account(
        mut,
        constraint = vault.key() == pool.vault @ PrivateScoreError::InvalidVault
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = borrower_token_account.mint == pool.token_mint @ PrivateScoreError::InvalidTokenMint
    )]
    pub borrower_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub collateral_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub collateral_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<BorrowStandard>, amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &ctx.accounts.pool;

    require!(amount > 0, PrivateScoreError::InvalidAmount);
    require!(pool.has_liquidity(amount), PrivateScoreError::InsufficientLiquidity);

    // Standard collateral ratio (150%)
    let collateral_ratio = pool.base_collateral_ratio;
    let required_collateral = (amount as u128 * collateral_ratio as u128 / 10000) as u64;

    require!(
        ctx.accounts.collateral_account.amount >= required_collateral,
        PrivateScoreError::InsufficientCollateral
    );

    // Transfer collateral
    let cpi_accounts = Transfer {
        from: ctx.accounts.collateral_account.to_account_info(),
        to: ctx.accounts.collateral_vault.to_account_info(),
        authority: ctx.accounts.borrower.to_account_info(),
    };
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        required_collateral,
    )?;

    // Transfer borrowed funds
    let pool_id_bytes = pool.pool_id.to_le_bytes();
    let seeds = &[b"pool".as_ref(), pool_id_bytes.as_ref(), &[pool.bump]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.borrower_token_account.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, &[seeds]),
        amount,
    )?;

    // Create loan record
    let loan = &mut ctx.accounts.loan;
    loan.borrower = ctx.accounts.borrower.key();
    loan.pool = ctx.accounts.pool.key();
    loan.principal = amount;
    loan.collateral_locked = required_collateral;
    loan.collateral_ratio = collateral_ratio;
    loan.interest_rate = pool.interest_rate;
    loan.loan_type = LoanType::Standard;
    loan.status = LoanStatus::Active;
    loan.created_at = clock.unix_timestamp;
    loan.last_accrual_at = clock.unix_timestamp;
    loan.bump = ctx.bumps.loan;

    // Update pool
    let pool = &mut ctx.accounts.pool;
    pool.total_borrowed = pool.total_borrowed.saturating_add(amount);
    pool.active_loans = pool.active_loans.saturating_add(1);
    pool.updated_at = clock.unix_timestamp;

    msg!("Standard loan created: {} tokens at {}% collateral", amount, collateral_ratio / 100);
    Ok(())
}