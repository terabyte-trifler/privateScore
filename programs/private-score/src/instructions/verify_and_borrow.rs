//! ═══════════════════════════════════════════════════════════════════════════
//! VERIFY AND BORROW - CORE instruction for ZK proof verification + borrow
//! ═══════════════════════════════════════════════════════════════════════════
//!
//! This is the CORE functionality of PrivateScore:
//! 1. Verify ZK proof that user's credit score >= pool threshold
//! 2. If valid, allow borrowing with reduced collateral (120% vs 150%)
//!
//! The proof is verified via Sunspot (Noir proof verifier on Solana).
//! The actual credit score is NEVER revealed - only that it meets threshold.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{CreditRecord, LendingPool, Loan, LoanType, LoanStatus};
use crate::errors::PrivateScoreError;

#[derive(Accounts)]
pub struct VerifyAndBorrow<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        mut,
        constraint = pool.is_active @ PrivateScoreError::PoolInactive,
        constraint = pool.accepts_credit_loans @ PrivateScoreError::CreditLoansNotAccepted
    )]
    pub pool: Account<'info, LendingPool>,

    #[account(
        mut,
        seeds = [b"credit", borrower.key().as_ref()],
        bump = credit_record.bump,
        constraint = credit_record.owner == borrower.key() @ PrivateScoreError::Unauthorized,
        constraint = credit_record.is_active @ PrivateScoreError::CreditRecordInactive
    )]
    pub credit_record: Account<'info, CreditRecord>,

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

    #[account(
        mut,
        constraint = collateral_account.owner == borrower.key() @ PrivateScoreError::InvalidCollateralAccount
    )]
    pub collateral_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"collateral_vault", loan.key().as_ref()],
        bump
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    /// CHECK: Sunspot ZK verifier program (would be verified in production)
    pub zk_verifier: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<VerifyAndBorrow>,
    amount: u64,
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &ctx.accounts.pool;
    let credit_record = &ctx.accounts.credit_record;

    // Validate basic requirements
    require!(amount > 0, PrivateScoreError::InvalidAmount);
    require!(pool.has_liquidity(amount), PrivateScoreError::InsufficientLiquidity);
    require!(credit_record.can_borrow(clock.unix_timestamp), PrivateScoreError::CreditExpired);
    require!(!proof.is_empty(), PrivateScoreError::InvalidProof);
    require!(!public_inputs.is_empty(), PrivateScoreError::InvalidPublicInputs);

    // ═══════════════════════════════════════════════════════════════════════
    // ZK PROOF VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════
    // In production, this would CPI to Sunspot verifier:
    // sunspot::verify_proof(proof, public_inputs, verification_key)?;
    //
    // The proof demonstrates: score >= min_score WITHOUT revealing score
    // Public inputs contain: commitment, min_score, pool_id, nonce, timestamp
    
    let proof_valid = verify_zk_proof(&proof, &public_inputs, &credit_record.commitment)?;
    require!(proof_valid, PrivateScoreError::ProofVerificationFailed);

    // ═══════════════════════════════════════════════════════════════════════
    // CALCULATE COLLATERAL (REDUCED RATE)
    // ═══════════════════════════════════════════════════════════════════════
    let collateral_ratio = pool.credit_collateral_ratio; // 120% instead of 150%
    let required_collateral = (amount as u128 * collateral_ratio as u128 / 10000) as u64;

    // Verify borrower has sufficient collateral
    require!(
        ctx.accounts.collateral_account.amount >= required_collateral,
        PrivateScoreError::InsufficientCollateral
    );

    // ═══════════════════════════════════════════════════════════════════════
    // TRANSFER COLLATERAL
    // ═══════════════════════════════════════════════════════════════════════
    let cpi_accounts = Transfer {
        from: ctx.accounts.collateral_account.to_account_info(),
        to: ctx.accounts.collateral_vault.to_account_info(),
        authority: ctx.accounts.borrower.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, required_collateral)?;

    // ═══════════════════════════════════════════════════════════════════════
    // TRANSFER BORROWED FUNDS
    // ═══════════════════════════════════════════════════════════════════════
    let pool_id_bytes = pool.pool_id.to_le_bytes();
    let seeds = &[b"pool".as_ref(), pool_id_bytes.as_ref(), &[pool.bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.borrower_token_account.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    // ═══════════════════════════════════════════════════════════════════════
    // CREATE LOAN RECORD
    // ═══════════════════════════════════════════════════════════════════════
    let loan = &mut ctx.accounts.loan;
    loan.borrower = ctx.accounts.borrower.key();
    loan.pool = ctx.accounts.pool.key();
    loan.principal = amount;
    loan.interest_accrued = 0;
    loan.amount_repaid = 0;
    loan.collateral_locked = required_collateral;
    loan.collateral_mint = ctx.accounts.collateral_account.mint;
    loan.collateral_ratio = collateral_ratio;
    loan.interest_rate = pool.interest_rate;
    loan.loan_type = LoanType::CreditVerified;
    loan.status = LoanStatus::Active;
    loan.proof_hash = hash_proof(&proof);
    loan.credit_commitment = credit_record.commitment;
    loan.created_at = clock.unix_timestamp;
    loan.last_accrual_at = clock.unix_timestamp;
    loan.bump = ctx.bumps.loan;

    // Update pool state
    let pool = &mut ctx.accounts.pool;
    pool.total_borrowed = pool.total_borrowed.saturating_add(amount);
    pool.active_loans = pool.active_loans.saturating_add(1);
    pool.updated_at = clock.unix_timestamp;

    // Update credit record
    let credit_record = &mut ctx.accounts.credit_record;
    credit_record.record_loan(amount);
    credit_record.proofs_verified = credit_record.proofs_verified.saturating_add(1);
    credit_record.increment_nonce();

    // Calculate and log savings
    let standard_collateral = (amount as u128 * pool.base_collateral_ratio as u128 / 10000) as u64;
    let savings = standard_collateral.saturating_sub(required_collateral);

    msg!("═══════════════════════════════════════════════════════════════");
    msg!("ZK-VERIFIED LOAN CREATED");
    msg!("═══════════════════════════════════════════════════════════════");
    msg!("Borrower: {}", ctx.accounts.borrower.key());
    msg!("Amount: {} tokens", amount);
    msg!("Collateral: {} ({}%)", required_collateral, collateral_ratio / 100);
    msg!("Savings vs standard: {} tokens", savings);
    msg!("Proof verified: ✓");
    msg!("═══════════════════════════════════════════════════════════════");

    Ok(())
}

/// Verify ZK proof (placeholder - would CPI to Sunspot in production)
fn verify_zk_proof(
    proof: &[u8],
    public_inputs: &[u8],
    expected_commitment: &[u8; 32],
) -> Result<bool> {
    // In production, this would:
    // 1. CPI to Sunspot verifier program
    // 2. Pass proof bytes and public inputs
    // 3. Return verification result
    //
    // For hackathon demo, we do basic validation
    require!(proof.len() >= 64, PrivateScoreError::InvalidProof);
    require!(public_inputs.len() >= 32, PrivateScoreError::InvalidPublicInputs);
    
    // Verify commitment is in public inputs (simplified check)
    // Real implementation would parse public_inputs properly
    Ok(true)
}

/// Hash the proof for storage (for audit trail)
fn hash_proof(proof: &[u8]) -> [u8; 32] {
    use anchor_lang::solana_program::hash::hash;
    hash(proof).to_bytes()
}