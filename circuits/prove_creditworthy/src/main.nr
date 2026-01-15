use std::hash::pedersen_hash;

// Main entry point - proves creditworthiness without revealing actual values
fn main(
    // Private inputs (never revealed)
    credit_score: u64,
    monthly_debt: u64,
    monthly_income: u64,
    successful_payments: u64,
    total_payments: u64,
    salt: Field,
    
    // Public inputs (verification parameters)
    min_credit_score: pub u64,
    max_dti_ratio: pub u64,
    min_payment_rate: pub u64
) -> pub ([u8; 32], u8, bool) {
    
    // 1. Verify credit score meets minimum threshold
    let score_ok = credit_score >= min_credit_score;
    
    // 2. Calculate and verify DTI ratio (debt * 100 / income < max)
    let dti_ratio = (monthly_debt * 100) / monthly_income;
    let dti_ok = dti_ratio <= max_dti_ratio;
    
    // 3. Verify payment history (successful * 100 / total >= min)
    let payment_rate = (successful_payments * 100) / total_payments;
    let payment_ok = payment_rate >= min_payment_rate;
    
    // 4. Create commitment (hash of score + salt)
    let commitment = pedersen_hash([credit_score as Field, salt]);
    let commitment_bytes: [u8; 32] = commitment.to_be_bytes();
    
    // 5. Determine credit tier based on score
    let tier: u8 = if credit_score >= 800 { 5 }
               else if credit_score >= 740 { 4 }
               else if credit_score >= 670 { 3 }
               else if credit_score >= 580 { 2 }
               else { 1 };
    
    // 6. Final creditworthiness = all checks pass
    let is_creditworthy = score_ok & dti_ok & payment_ok;
    
    // Return public outputs
    (commitment_bytes, tier, is_creditworthy)
}
