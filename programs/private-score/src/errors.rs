//! ═══════════════════════════════════════════════════════════════════════════
//! PRIVATESCORE ERRORS - Comprehensive error codes (6000-6699)
//! ═══════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;

#[error_code]
pub enum PrivateScoreError {
    // ═══════════════════════════════════════════════════════════════════════
    // GENERAL ERRORS (6000-6099)
    // ═══════════════════════════════════════════════════════════════════════
    
    #[msg("Unauthorized access")]
    Unauthorized = 6000,

    #[msg("Invalid amount specified")]
    InvalidAmount = 6001,

    #[msg("Operation overflow")]
    Overflow = 6002,

    #[msg("Invalid account state")]
    InvalidAccountState = 6003,

    #[msg("Account already initialized")]
    AlreadyInitialized = 6004,

    #[msg("Account not initialized")]
    NotInitialized = 6005,

    // ═══════════════════════════════════════════════════════════════════════
    // POOL ERRORS (6100-6199)
    // ═══════════════════════════════════════════════════════════════════════

    #[msg("Pool is not active")]
    PoolInactive = 6100,

    #[msg("Pool does not accept credit-verified loans")]
    CreditLoansNotAccepted = 6101,

    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity = 6102,

    #[msg("Invalid collateral ratio")]
    InvalidCollateralRatio = 6103,

    #[msg("Invalid interest rate")]
    InvalidInterestRate = 6104,

    #[msg("Invalid token mint")]
    InvalidTokenMint = 6105,

    #[msg("Invalid vault account")]
    InvalidVault = 6106,

    #[msg("Pool utilization too high")]
    UtilizationTooHigh = 6107,

    // ═══════════════════════════════════════════════════════════════════════
    // CREDIT ERRORS (6200-6299)
    // ═══════════════════════════════════════════════════════════════════════

    #[msg("Invalid credit score")]
    InvalidCreditScore = 6200,

    #[msg("Credit record is not active")]
    CreditRecordInactive = 6201,

    #[msg("Credit commitment has expired")]
    CreditExpired = 6202,

    #[msg("Invalid commitment hash")]
    InvalidCommitment = 6203,

    #[msg("Credit score below minimum threshold")]
    ScoreBelowThreshold = 6204,

    #[msg("Credit tier does not qualify")]
    TierDoesNotQualify = 6205,

    #[msg("Nonce mismatch - possible replay attack")]
    NonceMismatch = 6206,

    #[msg("Credit record already exists")]
    CreditRecordExists = 6207,

    // ═══════════════════════════════════════════════════════════════════════
    // LOAN ERRORS (6300-6399)
    // ═══════════════════════════════════════════════════════════════════════

    #[msg("Loan is not active")]
    LoanNotActive = 6300,

    #[msg("Insufficient collateral")]
    InsufficientCollateral = 6301,

    #[msg("Invalid collateral account")]
    InvalidCollateralAccount = 6302,

    #[msg("Repayment exceeds total debt")]
    RepaymentExceedsDebt = 6303,

    #[msg("Loan is not liquidatable")]
    LoanNotLiquidatable = 6304,

    #[msg("Loan is overdue")]
    LoanOverdue = 6305,

    #[msg("Maximum loans reached")]
    MaxLoansReached = 6306,

    #[msg("Loan duration invalid")]
    InvalidLoanDuration = 6307,

    #[msg("Health factor too low")]
    HealthFactorTooLow = 6308,

    // ═══════════════════════════════════════════════════════════════════════
    // ZK PROOF ERRORS (6400-6499)
    // ═══════════════════════════════════════════════════════════════════════

    #[msg("Invalid ZK proof")]
    InvalidProof = 6400,

    #[msg("Invalid public inputs")]
    InvalidPublicInputs = 6401,

    #[msg("Proof verification failed")]
    ProofVerificationFailed = 6402,

    #[msg("Proof has expired")]
    ProofExpired = 6403,

    #[msg("Proof commitment mismatch")]
    ProofCommitmentMismatch = 6404,

    #[msg("Verifier program error")]
    VerifierError = 6405,

    #[msg("Invalid verification key")]
    InvalidVerificationKey = 6406,

    #[msg("Circuit mismatch")]
    CircuitMismatch = 6407,

    // ═══════════════════════════════════════════════════════════════════════
    // VIEWING KEY ERRORS (6500-6599)
    // ═══════════════════════════════════════════════════════════════════════

    #[msg("Invalid viewing key")]
    InvalidViewingKey = 6500,

    #[msg("Viewing key is not active")]
    ViewingKeyNotActive = 6501,

    #[msg("Viewing key has expired")]
    ViewingKeyExpired = 6502,

    #[msg("Invalid access level")]
    InvalidAccessLevel = 6503,

    #[msg("Invalid expiry time")]
    InvalidExpiry = 6504,

    #[msg("Expiry time too long")]
    ExpiryTooLong = 6505,

    #[msg("Maximum accesses reached")]
    MaxAccessesReached = 6506,

    #[msg("Viewing key has been revoked")]
    ViewingKeyRevoked = 6507,

    #[msg("Insufficient access level")]
    InsufficientAccessLevel = 6508,

    // ═══════════════════════════════════════════════════════════════════════
    // LIGHT PROTOCOL ERRORS (6600-6649)
    // ═══════════════════════════════════════════════════════════════════════

    #[msg("Compression failed")]
    CompressionFailed = 6600,

    #[msg("Decompression failed")]
    DecompressionFailed = 6601,

    #[msg("Invalid Merkle proof")]
    InvalidMerkleProof = 6602,

    #[msg("Merkle tree full")]
    MerkleTreeFull = 6603,

    #[msg("Invalid compressed account")]
    InvalidCompressedAccount = 6604,

    // ═══════════════════════════════════════════════════════════════════════
    // RANGE PROTOCOL ERRORS (6650-6699)
    // ═══════════════════════════════════════════════════════════════════════

    #[msg("Disclosure not enabled")]
    DisclosureNotEnabled = 6650,

    #[msg("Invalid disclosure request")]
    InvalidDisclosureRequest = 6651,

    #[msg("Disclosure denied")]
    DisclosureDenied = 6652,

    #[msg("Invalid encryption")]
    InvalidEncryption = 6653,

    #[msg("Key derivation failed")]
    KeyDerivationFailed = 6654,
}