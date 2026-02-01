//! ═══════════════════════════════════════════════════════════════════════════
//! REPAY - Loan repayment with interest calculation
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{CreditRecord, LendingPool, Loan, LoanStatus};
use crate::errors::PrivateScoreError;

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(mut)]
    pub pool: Account<'info, LendingPool>,

    #[account(
        mut,
        constraint = loan.borrower == borrower.key() @ PrivateScoreError::Unauthorized,
        constraint = loan.status == LoanStatus::Active @ PrivateScoreError::LoanNotActive
    )]
    pub loan: Account<'info, Loan>,

    #[account(
        mut,
        seeds = [b"credit", borrower.key().as_ref()],
        bump = credit_record.bump
    )]
    pub credit_record: Option<Account<'info, CreditRecord>>,

    #[account(
        mut,
        constraint = borrower_token_account.mint == pool.token_mint @ PrivateScoreError::InvalidTokenMint
    )]
    pub borrower_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault.key() == pool.vault @ PrivateScoreError::InvalidVault
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub borrower_collateral_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Repay>, amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let loan = &mut ctx.accounts.loan;

    // Accrue interest first
    loan.accrue_interest(clock.unix_timestamp);

    let total_debt = loan.total_debt();
    require!(amount > 0, PrivateScoreError::InvalidAmount);
    require!(amount <= total_debt, PrivateScoreError::RepaymentExceedsDebt);

    // Transfer repayment to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.borrower_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.borrower.to_account_info(),
    };
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        amount,
    )?;

    // Update loan state
    loan.amount_repaid = loan.amount_repaid.saturating_add(amount);
    loan.repayment_count = loan.repayment_count.saturating_add(1);

    let is_fully_repaid = loan.total_debt() == 0;
    let is_on_time = !loan.is_overdue(clock.unix_timestamp);

    if is_fully_repaid {
        loan.status = LoanStatus::Repaid;
        loan.closed_at = clock.unix_timestamp;
        loan.repaid_on_time = is_on_time;

        // Return collateral
        let loan_key = ctx.accounts.loan.key();
        let seeds = &[b"collateral_vault".as_ref(), loan_key.as_ref(), &[ctx.bumps.collateral_vault]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.collateral_vault.to_account_info(),
            to: ctx.accounts.borrower_collateral_account.to_account_info(),
            authority: ctx.accounts.collateral_vault.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, &[seeds]),
            loan.collateral_locked,
        )?;

        // Update pool
        let pool = &mut ctx.accounts.pool;
        pool.total_borrowed = pool.total_borrowed.saturating_sub(loan.principal);
        pool.active_loans = pool.active_loans.saturating_sub(1);
        pool.total_interest_accrued = pool.total_interest_accrued.saturating_add(loan.interest_accrued);

        // Update credit record if exists
        if let Some(credit_record) = &mut ctx.accounts.credit_record {
            credit_record.record_repayment(loan.principal, is_on_time);
        }

        msg!("Loan fully repaid! Collateral returned: {}", loan.collateral_locked);
    } else {
        msg!("Partial repayment: {}. Remaining debt: {}", amount, loan.total_debt());
    }

    ctx.accounts.pool.updated_at = clock.unix_timestamp;
    Ok(())
}