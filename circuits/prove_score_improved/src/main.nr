// ═══════════════════════════════════════════════════════════════════════════════
// PROVE SCORE IMPROVED CIRCUIT
// ═══════════════════════════════════════════════════════════════════════════════
//
// Purpose: Prove credit score has INCREASED between two time periods WITHOUT
//          revealing either score value.
//
// Two-Commitment Comparison:
//   - old_commitment: Pedersen hash of previous score + old_salt + old_timestamp
//   - new_commitment: Pedersen hash of current score + new_salt + new_timestamp
//
// The circuit proves: new_score > old_score (strict improvement)
//
// What the verifier learns:
//   ✓ The prover's score has increased
//   ✓ Both commitments are valid
//   ✓ The improvement meets minimum threshold (if specified)
//   ✓ Temporal ordering is correct (new_timestamp > old_timestamp)
//
// What remains private:
//   ✗ Old score value
//   ✗ New score value
//   ✗ Exact improvement amount
//   ✗ All salts and timestamps
//
// Use Cases:
//   - Qualifying for better loan terms after credit improvement
//   - Proving financial progress without revealing numbers
//   - Tier upgrades (e.g., Fair → Good → Excellent)
//   - Reduced collateral requirements after improvement
// ═══════════════════════════════════════════════════════════════════════════════

use dep::std::hash::pedersen_hash;

// FICO score range constants
global MIN_VALID_SCORE: u32 = 300;
global MAX_VALID_SCORE: u32 = 850;

fn main(
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE INPUTS - Old Score
    // ═══════════════════════════════════════════════════════════════════════════
    old_score: Field,        // Previous credit score (PRIVATE)
    old_salt: Field,         // Salt for old commitment (PRIVATE)
    old_timestamp: Field,    // When old score was recorded (PRIVATE)
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE INPUTS - New Score
    // ═══════════════════════════════════════════════════════════════════════════
    new_score: Field,        // Current credit score (PRIVATE)
    new_salt: Field,         // Salt for new commitment (PRIVATE)
    new_timestamp: Field,    // When new score was recorded (PRIVATE)
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC INPUTS
    // ═══════════════════════════════════════════════════════════════════════════
    old_commitment: pub Field,       // Commitment to old score
    new_commitment: pub Field,       // Commitment to new score
    min_improvement: pub Field,      // Minimum score improvement required (0 for any)
    pool_id: pub Field,              // Pool identifier
    nonce: pub Field                 // Replay protection
) {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 1: Verify old commitment
    // Commitment includes timestamp to bind score to specific point in time
    // ═══════════════════════════════════════════════════════════════════════════
    
    let computed_old = pedersen_hash([old_score, old_salt, old_timestamp]);
    assert(computed_old == old_commitment, "Old commitment verification failed");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 2: Verify new commitment
    // ═══════════════════════════════════════════════════════════════════════════
    
    let computed_new = pedersen_hash([new_score, new_salt, new_timestamp]);
    assert(computed_new == new_commitment, "New commitment verification failed");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 3: Old score within valid FICO range (300-850)
    // ═══════════════════════════════════════════════════════════════════════════
    
    let old_score_u32 = old_score as u32;
    assert(old_score_u32 >= MIN_VALID_SCORE, "Old score below valid range");
    assert(old_score_u32 <= MAX_VALID_SCORE, "Old score above valid range");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 4: New score within valid FICO range (300-850)
    // ═══════════════════════════════════════════════════════════════════════════
    
    let new_score_u32 = new_score as u32;
    assert(new_score_u32 >= MIN_VALID_SCORE, "New score below valid range");
    assert(new_score_u32 <= MAX_VALID_SCORE, "New score above valid range");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 5: New score is STRICTLY GREATER than old score (CORE CHECK)
    // This is the main proof - score has improved
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(new_score_u32 > old_score_u32, "Score has not improved");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 6: Improvement meets minimum threshold
    // Allows pools to require significant improvement (e.g., at least 50 points)
    // ═══════════════════════════════════════════════════════════════════════════
    
    let min_improvement_u32 = min_improvement as u32;
    let actual_improvement = new_score_u32 - old_score_u32;
    
    assert(actual_improvement >= min_improvement_u32, "Improvement below minimum threshold");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 7: New timestamp is AFTER old timestamp
    // Ensures temporal ordering - can't prove "improvement" by swapping order
    // ═══════════════════════════════════════════════════════════════════════════
    
    let old_ts_u64 = old_timestamp as u64;
    let new_ts_u64 = new_timestamp as u64;
    
    assert(new_ts_u64 > old_ts_u64, "New timestamp must be after old timestamp");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 8: Pool and nonce validation (replay protection)
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(pool_id != 0, "Invalid pool ID");
    assert(nonce != 0, "Invalid nonce");
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

fn compute_score_commitment(score: Field, salt: Field, timestamp: Field) -> Field {
    pedersen_hash([score, salt, timestamp])
}

fn calculate_improvement(old_score: u32, new_score: u32) -> u32 {
    if new_score > old_score {
        new_score - old_score
    } else {
        0
    }
}

fn get_tier(score: u32) -> u8 {
    if score >= 800 {
        5  // Excellent
    } else if score >= 740 {
        4  // Very Good
    } else if score >= 670 {
        3  // Good
    } else if score >= 580 {
        2  // Fair
    } else {
        1  // Poor
    }
}

fn has_tier_improved(old_score: u32, new_score: u32) -> bool {
    get_tier(new_score) > get_tier(old_score)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_significant_improvement() {
    // Score improved from 620 to 720 (+100 points)
    let old_score: Field = 620;
    let old_salt: Field = 111111111111;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 720;
    let new_salt: Field = 222222222222;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        50,   // min_improvement: 50 points
        1, 1
    );
}

#[test]
fn test_minimal_improvement() {
    // Score improved by just 1 point (700 → 701)
    let old_score: Field = 700;
    let old_salt: Field = 333333333333;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 701;
    let new_salt: Field = 444444444444;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0,    // No minimum improvement required
        1, 1
    );
}

#[test]
fn test_tier_upgrade_fair_to_good() {
    // Upgraded from Fair (620) to Good (680)
    let old_score: Field = 620;
    let old_salt: Field = 555555555555;
    let old_ts: Field = 1690000000;
    
    let new_score: Field = 680;
    let new_salt: Field = 666666666666;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0,
        1, 1
    );
}

#[test]
fn test_tier_upgrade_good_to_excellent() {
    // Upgraded from Good (750) to Excellent (810)
    let old_score: Field = 750;
    let old_salt: Field = 777777777777;
    let old_ts: Field = 1695000000;
    
    let new_score: Field = 810;
    let new_salt: Field = 888888888888;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        50,   // Require at least 50 point improvement
        1, 1
    );
}

#[test]
fn test_improvement_at_minimum_threshold() {
    // Score improved by exactly 50 points (650 → 700)
    let old_score: Field = 650;
    let old_salt: Field = 999999999999;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 700;
    let new_salt: Field = 101010101010;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        50,   // Exactly meets threshold
        1, 1
    );
}

#[test]
fn test_poor_to_fair_upgrade() {
    // Poor (500) to Fair (600)
    let old_score: Field = 500;
    let old_salt: Field = 121212121212;
    let old_ts: Field = 1680000000;
    
    let new_score: Field = 600;
    let new_salt: Field = 131313131313;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0,
        1, 1
    );
}

#[test]
fn test_max_possible_improvement() {
    // From minimum (300) to maximum (850)
    let old_score: Field = 300;
    let old_salt: Field = 141414141414;
    let old_ts: Field = 1600000000;
    
    let new_score: Field = 850;
    let new_salt: Field = 151515151515;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        100,  // Even with high threshold, 550 point improvement passes
        1, 1
    );
}

#[test(should_fail)]
fn test_no_improvement_fails() {
    // Score unchanged (650 → 650)
    let old_score: Field = 650;
    let old_salt: Field = 161616161616;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 650;
    let new_salt: Field = 171717171717;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0, 1, 1
    );
}

#[test(should_fail)]
fn test_score_decreased_fails() {
    // Score went down (700 → 650)
    let old_score: Field = 700;
    let old_salt: Field = 181818181818;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 650;
    let new_salt: Field = 191919191919;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0, 1, 1
    );
}

#[test(should_fail)]
fn test_improvement_below_minimum_fails() {
    // Improved by 30 points but need 50 (650 → 680)
    let old_score: Field = 650;
    let old_salt: Field = 202020202020;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 680;
    let new_salt: Field = 212121212121;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        50,   // Requires 50, only got 30
        1, 1
    );
}

#[test(should_fail)]
fn test_wrong_timestamp_order_fails() {
    // New timestamp is before old timestamp
    let old_score: Field = 650;
    let old_salt: Field = 222222222222;
    let old_ts: Field = 1704000000;  // Later time
    
    let new_score: Field = 700;
    let new_salt: Field = 232323232323;
    let new_ts: Field = 1700000000;  // Earlier time
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0, 1, 1
    );
}

#[test(should_fail)]
fn test_invalid_old_commitment_fails() {
    let old_score: Field = 650;
    let old_salt: Field = 242424242424;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 700;
    let new_salt: Field = 252525252525;
    let new_ts: Field = 1704000000;
    
    let wrong_old_comm: Field = 12345;  // Wrong commitment
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        wrong_old_comm, new_comm,
        0, 1, 1
    );
}

#[test(should_fail)]
fn test_invalid_new_commitment_fails() {
    let old_score: Field = 650;
    let old_salt: Field = 262626262626;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 700;
    let new_salt: Field = 272727272727;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let wrong_new_comm: Field = 67890;  // Wrong commitment
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, wrong_new_comm,
        0, 1, 1
    );
}

#[test(should_fail)]
fn test_old_score_below_valid_range_fails() {
    let old_score: Field = 200;  // Below 300
    let old_salt: Field = 282828282828;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 400;
    let new_salt: Field = 292929292929;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0, 1, 1
    );
}

#[test(should_fail)]
fn test_new_score_above_valid_range_fails() {
    let old_score: Field = 800;
    let old_salt: Field = 303030303030;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 900;  // Above 850
    let new_salt: Field = 313131313131;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0, 1, 1
    );
}

#[test(should_fail)]
fn test_invalid_pool_id_fails() {
    let old_score: Field = 650;
    let old_salt: Field = 323232323232;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 700;
    let new_salt: Field = 333333333333;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0, 0, 1  // pool_id = 0
    );
}

#[test(should_fail)]
fn test_invalid_nonce_fails() {
    let old_score: Field = 650;
    let old_salt: Field = 343434343434;
    let old_ts: Field = 1700000000;
    
    let new_score: Field = 700;
    let new_salt: Field = 353535353535;
    let new_ts: Field = 1704000000;
    
    let old_comm = compute_score_commitment(old_score, old_salt, old_ts);
    let new_comm = compute_score_commitment(new_score, new_salt, new_ts);
    
    main(
        old_score, old_salt, old_ts,
        new_score, new_salt, new_ts,
        old_comm, new_comm,
        0, 1, 0  // nonce = 0
    );
}