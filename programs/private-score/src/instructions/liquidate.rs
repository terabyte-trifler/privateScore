//! ═══════════════════════════════════════════════════════════════════════════
//! LIQUIDATE - Liquidate undercollateralized loans
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{LendingPool, Loan, LoanStatus};
use crate::errors::PrivateScoreError;

/// Liquidation bonus for liquidators (5%)
const LIQUIDATION_BONUS_BPS: u64 = 500;

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(mut)]
    pub liquidator: Signer<'info>,

    #[account(mut)]
    pub pool: Account<'info, LendingPool>,

    #[account(
        mut,
        constraint = loan.status == LoanStatus::Active @ PrivateScoreError::LoanNotActive
    )]
    pub loan: Account<'info, Loan>,

    #[account(
        mut,
        constraint = liquidator_token_account.mint == pool.token_mint @ PrivateScoreError::InvalidTokenMint
    )]
    pub liquidator_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault.key() == pool.vault @ PrivateScoreError::InvalidVault
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub liquidator_collateral_account: Account<'info, TokenAccount>,

    /// CHECK: Price oracle for collateral value (simplified)
    pub price_oracle: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Liquidate>) -> Result<()> {
    let clock = Clock::get()?;
    let loan = &mut ctx.accounts.loan;
    let pool = &ctx.accounts.pool;

    // Accrue interest first
    loan.accrue_interest(clock.unix_timestamp);

    // Get collateral value (simplified - would use oracle in production)
    let collateral_value = ctx.accounts.collateral_vault.amount;
    
    // Check if loan is undercollateralized
    require!(
        loan.is_undercollateralized(collateral_value, pool.liquidation_threshold),
        PrivateScoreError::LoanNotLiquidatable
    );

    let total_debt = loan.total_debt();

    // Liquidator repays the debt
    let cpi_accounts = Transfer {
        from: ctx.accounts.liquidator_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.liquidator.to_account_info(),
    };
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        total_debt,
    )?;

    // Calculate liquidation bonus
    let bonus = (loan.collateral_locked as u128 * LIQUIDATION_BONUS_BPS as u128 / 10000) as u64;
    let collateral_to_liquidator = loan.collateral_locked.saturating_add(bonus).min(ctx.accounts.collateral_vault.amount);

    // Transfer collateral to liquidator (with bonus)
    let loan_key = ctx.accounts.loan.key();
    let seeds = &[b"collateral_vault".as_ref(), loan_key.as_ref(), &[ctx.bumps.collateral_vault]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.collateral_vault.to_account_info(),
        to: ctx.accounts.liquidator_collateral_account.to_account_info(),
        authority: ctx.accounts.collateral_vault.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, &[seeds]),
        collateral_to_liquidator,
    )?;

    // Update loan status
    loan.status = LoanStatus::Liquidated;
    loan.closed_at = clock.unix_timestamp;

    // Update pool
    let pool = &mut ctx.accounts.pool;
    pool.total_borrowed = pool.total_borrowed.saturating_sub(loan.principal);
    pool.active_loans = pool.active_loans.saturating_sub(1);
    pool.updated_at = clock.unix_timestamp;

    msg!("═══════════════════════════════════════════════════════════════");
    msg!("LOAN LIQUIDATED");
    msg!("═══════════════════════════════════════════════════════════════");
    msg!("Loan: {}", ctx.accounts.loan.key());
    msg!("Debt repaid: {}", total_debt);
    msg!("Collateral seized: {}", collateral_to_liquidator);
    msg!("Liquidation bonus: {}", bonus);
    msg!("═══════════════════════════════════════════════════════════════");

    Ok(())
}