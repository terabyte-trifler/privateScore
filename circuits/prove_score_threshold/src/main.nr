// ═══════════════════════════════════════════════════════════════════════════
//                    PROVE SCORE THRESHOLD CIRCUIT
//                       (Aztec/Noir $10k Bounty)
// ═══════════════════════════════════════════════════════════════════════════
//
// This circuit proves that a user's credit score exceeds a minimum threshold
// WITHOUT revealing the actual score.
//
// What the proof demonstrates:
// ✓ User knows a credit score that hashes to their public commitment
// ✓ That score is >= the minimum threshold
// ✓ The proof is bound to a specific pool and nonce (replay protection)
//
// What remains private:
// - The actual credit score (e.g., 720)
// - The salt used in the commitment

use dep::std;

fn main(
    // PRIVATE INPUTS (Known only to the prover/user)
    credit_score: Field,         // The actual score (e.g., 720)
    salt: Field,                 // Random salt for hiding

    // PUBLIC INPUTS (Visible to everyone)
    pub score_commitment: Field,  // Pedersen(score || salt)
    pub min_score: Field,         // Threshold (e.g., 650)
    pub pool_id: Field,           // Binds to specific pool
    pub nonce: Field,             // Replay protection
    pub timestamp: Field          // Freshness
) {
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRAINT 1: Score Validity (300-850 FICO range)
    // ═══════════════════════════════════════════════════════════════════════
    
    let min_valid_score: Field = 300;
    let max_valid_score: Field = 850;
    
    assert(credit_score as u32 >= min_valid_score as u32);
    assert(credit_score as u32 <= max_valid_score as u32);

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRAINT 2: Commitment Verification
    // ═══════════════════════════════════════════════════════════════════════
    
    // Compute expected commitment: Pedersen(score || salt)
    let computed_commitment = std::hash::pedersen_hash([credit_score, salt]);
    
    // Must match the registered commitment on-chain
    assert(computed_commitment == score_commitment);

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRAINT 3: Score Threshold Check (THE KEY CONSTRAINT!)
    // ═══════════════════════════════════════════════════════════════════════
    
    // This is what enables privacy-preserving credit:
    // We prove score >= threshold without revealing the actual score
    assert(credit_score as u32 >= min_score as u32);

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRAINT 4: Binding and Replay Protection
    // ═══════════════════════════════════════════════════════════════════════
    
    assert(pool_id != 0);
    assert(nonce != 0);
    assert(timestamp != 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[test]
fn test_valid_proof() {
    let score: Field = 720;
    let salt: Field = 12345;
    let min_score: Field = 650;
    
    let commitment = std::hash::pedersen_hash([score, salt]);
    
    // This should pass: 720 >= 650
    main(score, salt, commitment, min_score, 1, 1, 1704067200);
}

#[test(should_fail)]
fn test_score_below_threshold() {
    let score: Field = 600;  // Below 650!
    let salt: Field = 12345;
    let min_score: Field = 650;
    
    let commitment = std::hash::pedersen_hash([score, salt]);
    
    // This should FAIL: 600 < 650
    main(score, salt, commitment, min_score, 1, 1, 1704067200);
}