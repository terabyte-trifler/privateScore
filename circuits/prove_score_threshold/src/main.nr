// ═══════════════════════════════════════════════════════════════════════════════
// PROVE SCORE THRESHOLD CIRCUIT
// ═══════════════════════════════════════════════════════════════════════════════
//
// Purpose: Prove credit score ≥ minimum threshold WITHOUT revealing actual score
//
// What the verifier learns:
//   ✓ The prover knows a score that hashes to the public commitment
//   ✓ The score is >= min_score threshold
//   ✓ The score is within valid FICO range (300-850)
//
// What remains private:
//   ✗ The actual credit score value
//   ✗ The salt used in the commitment
// ═══════════════════════════════════════════════════════════════════════════════

use dep::std::hash::pedersen_hash;

// FICO score range constants
global MIN_VALID_SCORE: u32 = 300;
global MAX_VALID_SCORE: u32 = 850;

fn main(
    // PRIVATE INPUTS (known only to prover)
    credit_score: Field,     // Actual credit score (PRIVATE)
    salt: Field,             // Random salt for hiding (PRIVATE)
    
    // PUBLIC INPUTS (visible to verifier)
    score_commitment: pub Field,  // Pedersen commitment to score
    min_score: pub Field,         // Minimum score threshold
    pool_id: pub Field,           // Pool identifier
    nonce: pub Field              // Replay protection nonce
) {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 1: Verify commitment
    // ═══════════════════════════════════════════════════════════════════════════
    
    let computed_commitment = pedersen_hash([credit_score, salt]);
    assert(computed_commitment == score_commitment, "Commitment verification failed");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 2: Score meets minimum threshold
    // ═══════════════════════════════════════════════════════════════════════════
    
    let score_u32 = credit_score as u32;
    let min_score_u32 = min_score as u32;
    
    assert(score_u32 >= min_score_u32, "Score does not meet minimum threshold");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 3: Score within valid FICO range (300-850)
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(score_u32 >= MIN_VALID_SCORE, "Score below minimum valid range");
    assert(score_u32 <= MAX_VALID_SCORE, "Score above maximum valid range");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 4: Pool and nonce validation
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(pool_id != 0, "Invalid pool ID");
    assert(nonce != 0, "Invalid nonce");
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_valid_score_above_threshold() {
    let score: Field = 720;
    let salt: Field = 12345678901234567890;
    let commitment = pedersen_hash([score, salt]);
    main(score, salt, commitment, 650, 1, 1);
}

#[test(should_fail)]
fn test_score_below_threshold_fails() {
    let score: Field = 600;
    let salt: Field = 12345678901234567890;
    let commitment = pedersen_hash([score, salt]);
    main(score, salt, commitment, 650, 1, 1);
}