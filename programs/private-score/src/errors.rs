use anchor_lang::prelude::*;

#[error_code]
pub enum PrivateScoreError {
    // Pool errors (6000-6099)
    #[msg("Pool is not active")]
    PoolInactive,
    #[msg("Invalid collateral ratio")]
    InvalidCollateralRatio,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
    #[msg("Pool name too long")]
    PoolNameTooLong,
    
    // Loan errors (6100-6199)
    #[msg("Loan amount too small")]
    LoanAmountTooSmall,
    #[msg("Loan amount too large")]
    LoanAmountTooLarge,
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Loan is not active")]
    LoanNotActive,
    #[msg("Loan is not liquidatable")]
    LoanNotLiquidatable,
    #[msg("Unauthorized loan access")]
    UnauthorizedLoanAccess,
    #[msg("Repay amount exceeds debt")]
    RepayAmountExceedsDebt,
    
    // ZK Proof errors (6200-6299)
    #[msg("Invalid ZK proof")]
    InvalidProof,
    #[msg("Invalid public inputs")]
    InvalidPublicInputs,
    #[msg("Proof verification failed")]
    ProofVerificationFailed,
    #[msg("Commitment mismatch")]
    CommitmentMismatch,
    #[msg("Nonce mismatch - possible replay")]
    NonceMismatch,
    #[msg("Commitment has expired")]
    CommitmentExpired,
    
    // Credit errors (6300-6399)
    #[msg("Credit record not found")]
    CreditRecordNotFound,
    #[msg("Credit record is inactive")]
    CreditRecordInactive,
    #[msg("Credit score below minimum")]
    CreditScoreBelowMinimum,
    #[msg("Invalid credit tier")]
    InvalidCreditTier,
    
    // Compliance errors (6400-6499)
    #[msg("Viewing access expired")]
    ViewingAccessExpired,
    #[msg("Unauthorized viewer")]
    UnauthorizedViewer,
    #[msg("Invalid viewing scope")]
    InvalidViewingScope,
    
    // Math errors (6500-6599)
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Math underflow")]
    MathUnderflow,
    #[msg("Division by zero")]
    DivisionByZero,
}