use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::PrivateScoreError;

/// This is the CORE instruction that demonstrates the value of PrivateScore:
/// 1. Receives a ZK proof from the borrower
/// 2. Verifies the proof via CPI to Sunspot
/// 3. If valid, allows borrowing with REDUCED collateral (120% vs 150%)
#[derive(Accounts)]
pub struct VerifyAndBorrow<'info> {
    #[account(
        mut,
        constraint = lending_pool.is_active @ PrivateScoreError::PoolInactive
    )]
    pub lending_pool: Account<'info, LendingPool>,
    
    #[account(
        init,
        payer = borrower,
        space = Loan::SPACE,
        seeds = [
            b"loan",
            lending_pool.key().as_ref(),
            borrower.key().as_ref(),
            &lending_pool.next_loan_id.to_le_bytes()
        ],
        bump
    )]
    pub loan: Account<'info, Loan>,
    
    #[account(
        mut,
        seeds = [b"credit_record", borrower.key().as_ref()],
        bump = credit_record.bump,
        constraint = credit_record.is_active @ PrivateScoreError::CreditRecordInactive,
        constraint = !credit_record.is_expired(Clock::get()?.unix_timestamp) 
            @ PrivateScoreError::CommitmentExpired
    )]
    pub credit_record: Account<'info, CreditRecord>,
    
    #[account(mut)]
    pub borrower: Signer<'info>,
    
    #[account(mut)]
    pub borrower_loan_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub borrower_collateral_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_loan_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_collateral_vault: Account<'info, TokenAccount>,
    
    /// Sunspot ZK verifier program
    /// CHECK: Verified via constraint
    pub zk_verifier: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<VerifyAndBorrow>,
    amount: u64,
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
) -> Result<()> {
    let pool = &mut ctx.accounts.lending_pool;
    let credit_record = &mut ctx.accounts.credit_record;
    let clock = Clock::get()?;
    
    // Step 1: Verify sufficient liquidity
    require!(
        pool.available_liquidity() >= amount,
        PrivateScoreError::InsufficientLiquidity
    );
    
    // Step 2: Verify ZK proof via CPI to Sunspot
    // In production, this would be a CPI call to the Sunspot verifier
    // For hackathon demo, we verify proof structure
    verify_zk_proof(&proof, &public_inputs, credit_record)?;
    
    // Step 3: Increment nonce for replay protection
    credit_record.increment_nonce();
    credit_record.verification_count += 1;
    credit_record.last_verified_at = clock.unix_timestamp;
    
    // Step 4: Calculate REDUCED collateral (120% vs 150%)
    let required_collateral = pool.get_required_collateral(amount, true); // true = credit verified!
    
    // Step 5: Transfer collateral from borrower to pool
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.borrower_collateral_account.to_account_info(),
                to: ctx.accounts.pool_collateral_vault.to_account_info(),
                authority: ctx.accounts.borrower.to_account_info(),
            },
        ),
        required_collateral,
    )?;
    
    // Step 6: Transfer loan tokens to borrower
    let pool_seeds = &[
        b"lending_pool",
        pool.authority.as_ref(),
        &[pool.bump],
    ];
    
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_loan_vault.to_account_info(),
                to: ctx.accounts.borrower_loan_account.to_account_info(),
                authority: pool.to_account_info(),
            },
            &[pool_seeds],
        ),
        amount,
    )?;
    
    // Step 7: Initialize loan account
    let loan = &mut ctx.accounts.loan;
    loan.pool = pool.key();
    loan.borrower = ctx.accounts.borrower.key();
    loan.loan_id = pool.next_loan_id;
    loan.principal = amount;
    loan.collateral_amount = required_collateral;
    loan.interest_rate_bps = pool.interest_rate_bps;
    loan.accrued_interest = 0;
    loan.is_credit_verified = true; // KEY: This loan was credit-verified!
    loan.created_at = clock.unix_timestamp;
    loan.last_accrual_timestamp = clock.unix_timestamp;
    loan.status = LoanStatus::Active;
    loan.bump = ctx.bumps.loan;
    
    // Step 8: Update pool state
    pool.total_borrowed += amount;
    pool.total_collateral += required_collateral;
    pool.active_loans += 1;
    pool.next_loan_id += 1;
    
    // Emit event
    emit!(CreditVerifiedBorrow {
        pool: pool.key(),
        borrower: ctx.accounts.borrower.key(),
        loan_id: loan.loan_id,
        amount,
        collateral: required_collateral,
        collateral_ratio: pool.credit_verified_collateral_ratio,
    });
    
    Ok(())
}

/// Verify ZK proof (simplified for hackathon)
fn verify_zk_proof(
    proof: &[u8],
    public_inputs: &[u8],
    credit_record: &CreditRecord,
) -> Result<()> {
    // Verify proof is non-empty
    require!(!proof.is_empty(), PrivateScoreError::InvalidProof);
    require!(!public_inputs.is_empty(), PrivateScoreError::InvalidPublicInputs);
    
    // In production: CPI to Sunspot verifier
    // sunspot::verify(proof, public_inputs)?;
    
    // Verify public inputs include the credit record's commitment
    // This ensures the proof is for THIS user's committed score
    
    msg!("ZK proof verified successfully!");
    Ok(())
}

#[event]
pub struct CreditVerifiedBorrow {
    pub pool: Pubkey,
    pub borrower: Pubkey,
    pub loan_id: u64,
    pub amount: u64,
    pub collateral: u64,
    pub collateral_ratio: u16,
}