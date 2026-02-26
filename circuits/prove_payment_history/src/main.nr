// ═══════════════════════════════════════════════════════════════════════════════
// PROVE PAYMENT HISTORY CIRCUIT
// ═══════════════════════════════════════════════════════════════════════════════
//
// Purpose: Prove on-time payment rate ≥ minimum WITHOUT revealing exact counts
//
// Division-Free Approach:
//   Traditional: (on_time / total) >= (min_rate / 10000)
//   Division-free: on_time * 10000 >= total * min_rate
//
// What the verifier learns:
//   ✓ The prover's on-time payment rate >= min_rate
//   ✓ The prover has >= min_payment_count total payments
//   ✓ The commitment is valid
//
// What remains private:
//   ✗ Exact number of on-time payments
//   ✗ Exact total payment count
//   ✗ Individual payment details
// ═══════════════════════════════════════════════════════════════════════════════

use dep::std::hash::pedersen_hash;

// Constants
global BASIS_POINTS: u64 = 10000;
global MAX_PAYMENTS: u32 = 100000;

fn main(
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE INPUTS
    // ═══════════════════════════════════════════════════════════════════════════
    on_time_payments: Field,    // Number of on-time payments (PRIVATE)
    total_payments: Field,      // Total number of payments (PRIVATE)
    history_salt: Field,        // Salt for commitment (PRIVATE)
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC INPUTS
    // ═══════════════════════════════════════════════════════════════════════════
    history_commitment: pub Field,   // Commitment to payment history
    min_payment_rate: pub Field,     // Minimum rate in basis points (9000 = 90%)
    min_payment_count: pub Field,    // Minimum total payments required
    pool_id: pub Field,              // Pool identifier
    nonce: pub Field                 // Replay protection
) {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 1: Verify history commitment
    // Commitment includes both on_time and total to prevent manipulation
    // ═══════════════════════════════════════════════════════════════════════════
    
    let computed_commitment = pedersen_hash([on_time_payments, total_payments, history_salt]);
    assert(computed_commitment == history_commitment, "History commitment failed");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 2: Total payments must be positive
    // ═══════════════════════════════════════════════════════════════════════════
    
    let total_u32 = total_payments as u32;
    assert(total_u32 > 0, "Must have at least one payment");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 3: On-time payments cannot exceed total
    // ═══════════════════════════════════════════════════════════════════════════
    
    let on_time_u32 = on_time_payments as u32;
    assert(on_time_u32 <= total_u32, "On-time cannot exceed total");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 4: Meet minimum payment count requirement
    // ═══════════════════════════════════════════════════════════════════════════
    
    let min_count_u32 = min_payment_count as u32;
    assert(total_u32 >= min_count_u32, "Insufficient payment history");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 5: Payment rate check (DIVISION-FREE)
    // 
    // Instead of: (on_time / total) >= (min_rate / 10000)
    // We prove:   on_time * 10000 >= total * min_rate
    // ═══════════════════════════════════════════════════════════════════════════
    
    let min_rate_u64 = min_payment_rate as u64;
    let on_time_u64 = on_time_payments as u64;
    let total_u64 = total_payments as u64;
    
    // Left side: on_time * 10000
    let on_time_scaled = on_time_u64 * BASIS_POINTS;
    
    // Right side: total * min_rate
    let total_min_rate = total_u64 * min_rate_u64;
    
    // Core constraint: on_time * 10000 >= total * min_rate
    assert(on_time_scaled >= total_min_rate, "Payment rate below minimum");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 6: min_rate must be valid (0-100%)
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(min_rate_u64 <= BASIS_POINTS, "Min rate cannot exceed 100%");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 7: Values within bounds (prevent overflow)
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(total_u32 <= MAX_PAYMENTS, "Total payments exceeds maximum");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 8: Pool and nonce validation
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(pool_id != 0, "Invalid pool ID");
    assert(nonce != 0, "Invalid nonce");
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

fn compute_history_commitment(on_time: Field, total: Field, salt: Field) -> Field {
    pedersen_hash([on_time, total, salt])
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_excellent_payment_history() {
    // 95 out of 100 on-time = 95%
    let on_time: Field = 95;
    let total: Field = 100;
    let salt: Field = 123456789012345;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 10, 1, 1);  // 90% min
}

#[test]
fn test_perfect_payment_history() {
    // 50 out of 50 on-time = 100%
    let on_time: Field = 50;
    let total: Field = 50;
    let salt: Field = 987654321098765;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 10, 1, 1);
}

#[test]
fn test_rate_at_threshold() {
    // 90 out of 100 on-time = 90% (exactly at threshold)
    let on_time: Field = 90;
    let total: Field = 100;
    let salt: Field = 111222333444555;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 50, 1, 1);  // 90% min
}

#[test]
fn test_minimum_payment_count() {
    // 10 out of 10 = 100%, exactly at min count
    let on_time: Field = 10;
    let total: Field = 10;
    let salt: Field = 444555666777888;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 10, 1, 1);
}

#[test]
fn test_high_volume_good_rate() {
    // 950 out of 1000 = 95%
    let on_time: Field = 950;
    let total: Field = 1000;
    let salt: Field = 555666777888999;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 100, 1, 1);
}

#[test]
fn test_lower_threshold_80_percent() {
    // 85 out of 100 = 85% (above 80% threshold)
    let on_time: Field = 85;
    let total: Field = 100;
    let salt: Field = 666777888999000;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 8000, 10, 1, 1);  // 80% min
}

#[test(should_fail)]
fn test_rate_below_threshold_fails() {
    // 80 out of 100 = 80% (below 90% threshold)
    let on_time: Field = 80;
    let total: Field = 100;
    let salt: Field = 777888999000111;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 10, 1, 1);
}

#[test(should_fail)]
fn test_insufficient_payment_count_fails() {
    // 5 out of 5 = 100%, but only 5 payments (need 10)
    let on_time: Field = 5;
    let total: Field = 5;
    let salt: Field = 101010101010101;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 10, 1, 1);
}

#[test(should_fail)]
fn test_on_time_exceeds_total_fails() {
    // Invalid: 110 on-time out of 100 total
    let on_time: Field = 110;
    let total: Field = 100;
    let salt: Field = 202020202020202;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 10, 1, 1);
}

#[test(should_fail)]
fn test_zero_total_payments_fails() {
    // Invalid: 0 total payments
    let on_time: Field = 0;
    let total: Field = 0;
    let salt: Field = 303030303030303;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 10, 1, 1);
}

#[test(should_fail)]
fn test_invalid_commitment_fails() {
    let on_time: Field = 95;
    let total: Field = 100;
    let salt: Field = 404040404040404;
    
    let wrong_commitment: Field = 12345;  // Wrong commitment
    main(on_time, total, salt, wrong_commitment, 9000, 10, 1, 1);
}

#[test(should_fail)]
fn test_invalid_pool_id_fails() {
    let on_time: Field = 95;
    let total: Field = 100;
    let salt: Field = 505050505050505;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 10, 0, 1);  // pool_id = 0
}

#[test(should_fail)]
fn test_invalid_nonce_fails() {
    let on_time: Field = 95;
    let total: Field = 100;
    let salt: Field = 606060606060606;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 9000, 10, 1, 0);  // nonce = 0
}

#[test(should_fail)]
fn test_rate_exceeds_100_percent_fails() {
    let on_time: Field = 95;
    let total: Field = 100;
    let salt: Field = 707070707070707;
    
    let commitment = compute_history_commitment(on_time, total, salt);
    main(on_time, total, salt, commitment, 10001, 10, 1, 1);  // min_rate > 100%
}