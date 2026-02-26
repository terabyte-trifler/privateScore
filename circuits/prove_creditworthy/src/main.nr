// ═══════════════════════════════════════════════════════════════════════════════
// PROVE CREDITWORTHY CIRCUIT - COMPREHENSIVE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Purpose: COMPREHENSIVE proof combining ALL THREE creditworthiness checks:
//   1. Credit score >= minimum threshold
//   2. DTI ratio <= maximum threshold  
//   3. Payment history rate >= minimum threshold
//
// Master Commitment Linking:
//   All individual commitments are linked through a master commitment to prove
//   they belong to the same identity without revealing individual values.
// ═══════════════════════════════════════════════════════════════════════════════

use dep::std::hash::pedersen_hash;

global BASIS_POINTS: u64 = 10000;
global MIN_VALID_SCORE: u32 = 300;
global MAX_VALID_SCORE: u32 = 850;
global MAX_VALUE: u64 = 1000000000000;

fn main(
    // PRIVATE INPUTS - Credit Score
    credit_score: Field,
    score_salt: Field,
    
    // PRIVATE INPUTS - DTI Data
    monthly_income: Field,
    monthly_debt: Field,
    income_salt: Field,
    debt_salt: Field,
    
    // PRIVATE INPUTS - Payment History
    on_time_payments: Field,
    total_payments: Field,
    history_salt: Field,
    
    // PRIVATE INPUTS - Master Linking
    master_salt: Field,
    
    // PUBLIC INPUTS
    master_commitment: pub Field,
    min_score: pub Field,
    max_dti_bps: pub Field,
    min_payment_rate: pub Field,
    min_payment_count: pub Field,
    pool_id: pub Field,
    nonce: pub Field,
    timestamp: pub Field
) {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Compute individual commitments
    // ═══════════════════════════════════════════════════════════════════════════
    
    let score_commitment = pedersen_hash([credit_score, score_salt]);
    let income_commitment = pedersen_hash([monthly_income, income_salt]);
    let debt_commitment = pedersen_hash([monthly_debt, debt_salt]);
    let history_commitment = pedersen_hash([on_time_payments, total_payments, history_salt]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Verify master commitment links all individual commitments
    // ═══════════════════════════════════════════════════════════════════════════
    
    let computed_master = pedersen_hash([
        score_commitment,
        income_commitment,
        debt_commitment,
        history_commitment,
        master_salt
    ]);
    
    assert(computed_master == master_commitment, "Master commitment verification failed");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Credit Score Check
    // ═══════════════════════════════════════════════════════════════════════════
    
    let score_u32 = credit_score as u32;
    let min_score_u32 = min_score as u32;
    
    assert(score_u32 >= min_score_u32, "Score below minimum threshold");
    assert(score_u32 >= MIN_VALID_SCORE, "Score below valid range");
    assert(score_u32 <= MAX_VALID_SCORE, "Score above valid range");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: DTI Ratio Check (Division-Free)
    // debt * 10000 <= income * max_dti
    // ═══════════════════════════════════════════════════════════════════════════
    
    let income_u64 = monthly_income as u64;
    let debt_u64 = monthly_debt as u64;
    let max_dti_u64 = max_dti_bps as u64;
    
    assert(income_u64 > 0, "Income must be positive");
    
    let debt_scaled = debt_u64 * BASIS_POINTS;
    let income_max_dti = income_u64 * max_dti_u64;
    assert(debt_scaled <= income_max_dti, "DTI exceeds maximum");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: Payment History Check (Division-Free)
    // on_time * 10000 >= total * min_rate
    // ═══════════════════════════════════════════════════════════════════════════
    
    let on_time_u64 = on_time_payments as u64;
    let total_u64 = total_payments as u64;
    let min_rate_u64 = min_payment_rate as u64;
    
    assert(total_u64 > 0, "Must have payment history");
    
    let on_time_scaled = on_time_u64 * BASIS_POINTS;
    let total_min_rate = total_u64 * min_rate_u64;
    assert(on_time_scaled >= total_min_rate, "Payment rate below minimum");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: Validation
    // ═══════════════════════════════════════════════════════════════════════════
    
    assert(pool_id != 0, "Invalid pool ID");
    assert(nonce != 0, "Invalid nonce");
    assert(timestamp != 0, "Invalid timestamp");
}