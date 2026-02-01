/**
 * CREDIT SCORE CALCULATION MODULE
 * FICO-like Scoring Algorithm for On-Chain Activity
 * 
 * Scoring Formula (300-850 range):
 * - Payment History (35%): On-time repayments vs defaults
 * - Credit Utilization (30%): Current debt / available credit
 * - Account History (15%): Age of oldest DeFi activity
 * - Protocol Diversity (10%): Number of protocols used
 * - Recent Activity (10%): Transaction frequency
 * 
 * RUNS ENTIRELY IN BROWSER - score never leaves user's device!
 */

const WEIGHTS = {
  paymentHistory: 35,
  creditUtilization: 30,
  accountHistory: 15,
  protocolDiversity: 10,
  recentActivity: 10,
};

export function calculateCreditScore(metrics: CreditMetrics): CreditScoreResult {
  // Calculate each component
  const paymentHistory = calculatePaymentHistoryScore(metrics);
  const creditUtilization = calculateUtilizationScore(metrics);
  const accountHistory = calculateAccountHistoryScore(metrics);
  const protocolDiversity = calculateDiversityScore(metrics);
  const recentActivity = calculateActivityScore(metrics);

  // Calculate weighted total
  const totalWeighted = 
    paymentHistory.weighted +
    creditUtilization.weighted +
    accountHistory.weighted +
    protocolDiversity.weighted +
    recentActivity.weighted;

  // Convert to 300-850 scale
  const rawScore = 300 + (totalWeighted / 100) * 550;
  const score = Math.round(Math.min(850, Math.max(300, rawScore)));

  return {
    score,
    tier: getTierFromScore(score),
    breakdown: { paymentHistory, creditUtilization, accountHistory, protocolDiversity, recentActivity },
    recommendations: generateRecommendations(...),
  };
}

/**
 * Payment History (35% of score)
 */
function calculatePaymentHistoryScore(metrics: CreditMetrics): ComponentScore {
  const totalPayments = metrics.onTimePayments + metrics.latePayments;
  
  if (totalPayments === 0) {
    return { score: 50, rating: 'Fair', details: 'No repayment history yet' };
  }
  
  const onTimeRate = metrics.onTimePayments / totalPayments;
  
  if (onTimeRate >= 0.98) return { score: 100, rating: 'Excellent' };
  if (onTimeRate >= 0.95) return { score: 90, rating: 'Good' };
  if (onTimeRate >= 0.90) return { score: 70, rating: 'Fair' };
  return { score: Math.max(20, onTimeRate * 100), rating: 'Poor' };
}