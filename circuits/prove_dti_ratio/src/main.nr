// ═══════════════════════════════════════════════════════════════════════════════
// PROVE DTI RATIO CIRCUIT
// ═══════════════════════════════════════════════════════════════════════════════
//
// Purpose: Prove Debt-to-Income ratio ≤ maximum WITHOUT revealing income or debt
//
// Division-Free Approach (more efficient in ZK):
//   Traditional: (debt / income) <= (max_dti / 10000)
//   Division-free: debt * 10000 <= income * max_dti
//
// This avoids expensive field division while proving the same relationship.
//
// What the verifier learns:
//   ✓ The prover's DTI ratio is <= max_dti_bps
//   ✓ The income and debt commitments are valid
//
// What remains private:
//   ✗ Actual monthly income
//   ✗ Actual monthly debt
//   ✗ The salts used in commitments
// ═══════════════════════════════════════════════════════════════════════════════

use dep::std::hash::pedersen_hash;

// Basis points for precision (10000 = 100%)
global BASIS_POINTS: u64 = 10000;
global MAX_VALUE: u64 = 1000000000000;  // Max value to prevent overflow

fn main(
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE INPUTS
    // ═══════════════════════════════════════════════════════════════════════════
    monthly_income: Field,       // Monthly income in cents (PRIVATE)
    monthly_debt: Field,         // Monthly debt payments in cents (PRIVATE)
    income_salt: Field,          // Salt for income commitment (PRIVATE)
    debt_salt: Field,            // Salt for debt commitment (PRIVATE)
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC INPUTS
    // ═══════════════════════════════════════════════════════════════════════════
    income_commitment: pub Field, // Commitment to income
    debt_commitment: pub Field,   // Commitment to debt
    max_dti_bps: pub Field,       // Max DTI in basis points (4000 = 40%)
    pool_id: pub Field,           // Pool identifier
    nonce: pub Field              // Replay protection
) {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 1: Verify income commitment
    // ═══════════════════════════════════════════════════════════════════════════
    
    let computed_income = pedersen_hash([monthly_income, income_salt]);
    assert(computed_income == income_commitment, "Income commitment failed");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 2: Verify debt commitment
    // ═══════════════════════════════════════════════════════════════════════════
    
    let computed_debt = pedersen_hash([monthly_debt, debt_salt]);
    assert(computed_debt == debt_commitment, "Debt commitment failed");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 3: Income must be positive
    // ═══════════════════════════════════════════════════════════════════════════
    
    let income_u64 = monthly_income as u64;
    assert(income_u64 > 0, "Income must be positive");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 4: Values within reasonable bounds
    // ═══════════════════════════════════════════════════════════════════════════
    
    let debt_u64 = monthly_debt as u64;
    assert(income_u64 <= MAX_VALUE, "Income exceeds maximum");
    assert(debt_u64 <= MAX_VALUE, "Debt exceeds maximum");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 5: DTI ratio check (DIVISION-FREE)
    // 
    // Instead of: (debt / income) <= (max_dti / 10000)
    // We prove:   debt * 10000 <= income * max_dti
    // ═══════════════════════════════════════════════════════════════════════════
    
    let max_dti_u64 = max_dti_bps as u64;
    
    // Left side: debt * 10000
    let debt_scaled = debt_u64 * BASIS_POINTS;
    
    // Right side: income * max_dti
    let income_max_dti = income_u64 * max_dti_u64;
    
    // Core constraint: debt * 10000 <= income * max_dti
    assert(debt_scaled <= income_max_dti, "DTI exceeds maximum threshold");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 6: max_dti must be reasonable (0-100%)
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(max_dti_u64 > 0, "Max DTI must be positive");
    assert(max_dti_u64 <= BASIS_POINTS, "Max DTI cannot exceed 100%");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRAINT 7: Pool and nonce validation
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(pool_id != 0, "Invalid pool ID");
    assert(nonce != 0, "Invalid nonce");
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

fn compute_commitment(value: Field, salt: Field) -> Field {
    pedersen_hash([value, salt])
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_healthy_dti_30_percent() {
    // Income: $5000, Debt: $1500 = 30% DTI (below 40% max)
    let income: Field = 500000;
    let debt: Field = 150000;
    let income_salt: Field = 111111111111;
    let debt_salt: Field = 222222222222;
    
    let income_comm = compute_commitment(income, income_salt);
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, income_comm, debt_comm, 4000, 1, 1);
}

#[test]
fn test_dti_at_threshold() {
    // Income: $5000, Debt: $2000 = 40% DTI (exactly at threshold)
    let income: Field = 500000;
    let debt: Field = 200000;
    let income_salt: Field = 333333333333;
    let debt_salt: Field = 444444444444;
    
    let income_comm = compute_commitment(income, income_salt);
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, income_comm, debt_comm, 4000, 1, 1);
}

#[test]
fn test_low_dti_10_percent() {
    // Income: $10000, Debt: $1000 = 10% DTI
    let income: Field = 1000000;
    let debt: Field = 100000;
    let income_salt: Field = 555555555555;
    let debt_salt: Field = 666666666666;
    
    let income_comm = compute_commitment(income, income_salt);
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, income_comm, debt_comm, 4000, 1, 1);
}

#[test]
fn test_zero_debt() {
    // Zero debt = 0% DTI
    let income: Field = 500000;
    let debt: Field = 0;
    let income_salt: Field = 777777777777;
    let debt_salt: Field = 888888888888;
    
    let income_comm = compute_commitment(income, income_salt);
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, income_comm, debt_comm, 4000, 1, 1);
}

#[test]
fn test_high_income_low_debt() {
    // Income: $20000, Debt: $2000 = 10% DTI
    let income: Field = 2000000;
    let debt: Field = 200000;
    let income_salt: Field = 999999999999;
    let debt_salt: Field = 101010101010;
    
    let income_comm = compute_commitment(income, income_salt);
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, income_comm, debt_comm, 4000, 1, 1);
}

#[test(should_fail)]
fn test_dti_above_threshold_fails() {
    // Income: $5000, Debt: $2500 = 50% DTI (above 40%)
    let income: Field = 500000;
    let debt: Field = 250000;
    let income_salt: Field = 121212121212;
    let debt_salt: Field = 131313131313;
    
    let income_comm = compute_commitment(income, income_salt);
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, income_comm, debt_comm, 4000, 1, 1);
}

#[test(should_fail)]
fn test_invalid_income_commitment_fails() {
    let income: Field = 500000;
    let debt: Field = 150000;
    let income_salt: Field = 141414141414;
    let debt_salt: Field = 151515151515;
    
    let wrong_income_comm: Field = 12345;  // Wrong commitment
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, wrong_income_comm, debt_comm, 4000, 1, 1);
}

#[test(should_fail)]
fn test_invalid_debt_commitment_fails() {
    let income: Field = 500000;
    let debt: Field = 150000;
    let income_salt: Field = 161616161616;
    let debt_salt: Field = 171717171717;
    
    let income_comm = compute_commitment(income, income_salt);
    let wrong_debt_comm: Field = 67890;  // Wrong commitment
    
    main(income, debt, income_salt, debt_salt, income_comm, wrong_debt_comm, 4000, 1, 1);
}

#[test(should_fail)]
fn test_zero_income_fails() {
    // Zero income should fail
    let income: Field = 0;
    let debt: Field = 100000;
    let income_salt: Field = 181818181818;
    let debt_salt: Field = 191919191919;
    
    let income_comm = compute_commitment(income, income_salt);
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, income_comm, debt_comm, 4000, 1, 1);
}

#[test(should_fail)]
fn test_invalid_pool_id_fails() {
    let income: Field = 500000;
    let debt: Field = 150000;
    let income_salt: Field = 202020202020;
    let debt_salt: Field = 212121212121;
    
    let income_comm = compute_commitment(income, income_salt);
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, income_comm, debt_comm, 4000, 0, 1);  // pool_id = 0
}

#[test(should_fail)]
fn test_invalid_nonce_fails() {
    let income: Field = 500000;
    let debt: Field = 150000;
    let income_salt: Field = 222222222222;
    let debt_salt: Field = 232323232323;
    
    let income_comm = compute_commitment(income, income_salt);
    let debt_comm = compute_commitment(debt, debt_salt);
    
    main(income, debt, income_salt, debt_salt, income_comm, debt_comm, 4000, 1, 0);  // nonce = 0
}