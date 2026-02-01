// ═══════════════════════════════════════════════════════════════════════════
//                    PROVE CREDITWORTHY CIRCUIT
//          Comprehensive Privacy-Preserving Credit Assessment
// ═══════════════════════════════════════════════════════════════════════════
//
// This is the MAIN circuit - proves ALL THREE criteria in one proof:
// 1. Credit Score >= minimum threshold
// 2. DTI Ratio <= maximum threshold
// 3. Payment History Rate >= minimum threshold

use dep::std;

fn main(
    // PRIVATE: Credit Score
    credit_score: Field,
    score_salt: Field,

    // PRIVATE: DTI
    monthly_income: Field,
    monthly_debt: Field,
    income_salt: Field,
    debt_salt: Field,

    // PRIVATE: Payment History
    on_time_payments: Field,
    total_payments: Field,
    history_salt: Field,

    // PUBLIC: Commitments
    pub master_commitment: Field,
    pub score_commitment: Field,
    pub income_commitment: Field,
    pub debt_commitment: Field,
    pub history_commitment: Field,

    // PUBLIC: Thresholds
    pub min_credit_score: Field,
    pub max_dti_bps: Field,
    pub min_payment_rate_bps: Field,
    pub min_payment_count: Field,

    // PUBLIC: Binding
    pub pool_id: Field,
    pub nonce: Field,
    pub timestamp: Field
) {
    // STEP 1: Verify All Commitments
    let computed_score = std::hash::pedersen_hash([credit_score, score_salt]);
    assert(computed_score == score_commitment);
    
    let computed_income = std::hash::pedersen_hash([monthly_income, income_salt]);
    assert(computed_income == income_commitment);
    
    let computed_debt = std::hash::pedersen_hash([monthly_debt, debt_salt]);
    assert(computed_debt == debt_commitment);
    
    let computed_history = std::hash::pedersen_hash([on_time_payments, total_payments, history_salt]);
    assert(computed_history == history_commitment);
    
    // Master commitment links all
    let computed_master = std::hash::pedersen_hash([
        computed_score, computed_income, computed_debt, computed_history
    ]);
    assert(computed_master == master_commitment);

    // STEP 2: Credit Score Check
    assert(credit_score as u32 >= 300);
    assert(credit_score as u32 <= 850);
    assert(credit_score as u32 >= min_credit_score as u32);

    // STEP 3: DTI Ratio Check (debt * 10000 <= income * max_dti)
    assert(monthly_income as u64 > 0);
    let debt_scaled = monthly_debt as u64 * 10000;
    let income_threshold = monthly_income as u64 * max_dti_bps as u64;
    assert(debt_scaled <= income_threshold);

    // STEP 4: Payment History Check
    assert(total_payments as u64 >= min_payment_count as u64);
    assert(on_time_payments as u64 <= total_payments as u64);
    let on_time_scaled = on_time_payments as u64 * 10000;
    let rate_threshold = total_payments as u64 * min_payment_rate_bps as u64;
    assert(on_time_scaled >= rate_threshold);

    // STEP 5: Binding
    assert(pool_id != 0);
    assert(nonce != 0);
    assert(timestamp != 0);
}