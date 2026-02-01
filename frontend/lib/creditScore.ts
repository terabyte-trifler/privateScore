/**
 * ===========================================================================
 * CREDIT SCORE CALCULATION MODULE
 * ===========================================================================
 *
 * FICO-like Scoring Algorithm for On-Chain DeFi Activity
 *
 * Scoring Formula (300-850 range):
 * - Payment History (35%): On-time repayments vs defaults
 * - Credit Utilization (30%): Current debt / available credit
 * - Account History (15%): Age of oldest DeFi activity
 * - Protocol Diversity (10%): Number of protocols used
 * - Recent Activity (10%): Transaction frequency and recency
 *
 * IMPORTANT: All calculations happen entirely in the browser!
 * The actual score NEVER leaves the user's device.
 */

import { CreditMetrics } from "./helius";
import { CREDIT_SCORE, CREDIT_TIERS } from "./constants";

// ===========================================================================
// TYPES
// ===========================================================================

export interface ComponentScore {
  score: number; // 0-100 raw score
  weighted: number; // Weighted contribution
  weight: number; // Weight percentage
  rating: "Poor" | "Fair" | "Good" | "Very Good" | "Excellent";
  details: string;
}

export interface ScoreBreakdown {
  paymentHistory: ComponentScore;
  creditUtilization: ComponentScore;
  accountHistory: ComponentScore;
  protocolDiversity: ComponentScore;
  recentActivity: ComponentScore;
}

export interface Recommendation {
  title: string;
  description: string;
  icon: string;
  impact?: number;
  priority: "high" | "medium" | "low";
}

export interface CreditScoreResult {
  score: number;
  tier: "Poor" | "Fair" | "Good" | "Very Good" | "Excellent";
  breakdown: ScoreBreakdown;
  recommendations: Recommendation[];
  trend?: "up" | "down" | "stable";
  lastUpdated: number;
}

// ===========================================================================
// SCORING WEIGHTS
// ===========================================================================

const WEIGHTS = {
  paymentHistory: CREDIT_SCORE.WEIGHTS.PAYMENT_HISTORY, // 35
  creditUtilization: CREDIT_SCORE.WEIGHTS.UTILIZATION, // 30
  accountHistory: CREDIT_SCORE.WEIGHTS.HISTORY, // 15
  protocolDiversity: CREDIT_SCORE.WEIGHTS.DIVERSITY, // 10
  recentActivity: CREDIT_SCORE.WEIGHTS.ACTIVITY, // 10
};

// ===========================================================================
// MAIN SCORING FUNCTION
// ===========================================================================

/**
 * Calculate credit score from on-chain metrics
 * This runs ENTIRELY IN THE BROWSER - score never leaves the user's device
 */
export function calculateCreditScore(
  metrics: CreditMetrics,
): CreditScoreResult {
  // Calculate each component
  const paymentHistory = calculatePaymentHistoryScore(metrics);
  const creditUtilization = calculateUtilizationScore(metrics);
  const accountHistory = calculateAccountHistoryScore(metrics);
  const protocolDiversity = calculateDiversityScore(metrics);
  const recentActivity = calculateActivityScore(metrics);

  // Calculate weighted total (0-100 scale)
  const totalWeighted =
    paymentHistory.weighted +
    creditUtilization.weighted +
    accountHistory.weighted +
    protocolDiversity.weighted +
    recentActivity.weighted;

  // Convert to 300-850 scale
  const rawScore =
    CREDIT_SCORE.MIN +
    (totalWeighted / 100) * (CREDIT_SCORE.MAX - CREDIT_SCORE.MIN);
  const score = Math.round(
    Math.min(CREDIT_SCORE.MAX, Math.max(CREDIT_SCORE.MIN, rawScore)),
  );

  // Determine tier
  const tier = getTierFromScore(score);

  // Generate recommendations
  const recommendations = generateRecommendations({
    paymentHistory,
    creditUtilization,
    accountHistory,
    protocolDiversity,
    recentActivity,
  });

  return {
    score,
    tier,
    breakdown: {
      paymentHistory,
      creditUtilization,
      accountHistory,
      protocolDiversity,
      recentActivity,
    },
    recommendations,
    trend: "stable", // Would need historical data to calculate
    lastUpdated: Date.now(),
  };
}

// ===========================================================================
// COMPONENT SCORING FUNCTIONS
// ===========================================================================

/**
 * Payment History (35% of score)
 * Based on on-time repayments vs late payments and defaults
 */
function calculatePaymentHistoryScore(metrics: CreditMetrics): ComponentScore {
  const { onTimePayments, latePayments, defaults } = metrics;
  const totalPayments = onTimePayments + latePayments + defaults;

  let score: number;
  let rating: ComponentScore["rating"];
  let details: string;

  if (totalPayments === 0) {
    score = 50;
    rating = "Fair";
    details =
      "No repayment history yet. Make some loan repayments to build credit.";
  } else {
    // Calculate on-time rate
    const onTimeRate = onTimePayments / totalPayments;

    // Heavy penalty for defaults
    const defaultPenalty = defaults * 15;
    // Light penalty for late payments
    const latePenalty = latePayments * 5;

    // Base score from on-time rate
    score = Math.max(0, onTimeRate * 100 - defaultPenalty - latePenalty);

    if (score >= 90) {
      rating = "Excellent";
      details = `${onTimePayments} of ${totalPayments} payments on time (${Math.round(
        onTimeRate * 100,
      )}%)`;
    } else if (score >= 75) {
      rating = "Very Good";
      details = `Good payment history with ${onTimePayments} on-time payments`;
    } else if (score >= 60) {
      rating = "Good";
      details = `${latePayments} late payment(s) affecting your score`;
    } else if (score >= 40) {
      rating = "Fair";
      details = `Multiple late payments. Focus on making payments on time.`;
    } else {
      rating = "Poor";
      details = `Payment history needs improvement. ${defaults} default(s) recorded.`;
    }
  }

  return {
    score,
    weighted: (score / 100) * WEIGHTS.paymentHistory,
    weight: WEIGHTS.paymentHistory,
    rating,
    details,
  };
}

/**
 * Credit Utilization (30% of score)
 * Based on current debt relative to total borrowed
 */
function calculateUtilizationScore(metrics: CreditMetrics): ComponentScore {
  const { totalBorrowed, totalRepaid } = metrics;

  let score: number;
  let rating: ComponentScore["rating"];
  let details: string;

  if (totalBorrowed === 0) {
    score = 70;
    rating = "Good";
    details =
      "No borrowing history. Consider taking a small loan to build credit.";
  } else {
    // Calculate current utilization
    const currentDebt = Math.max(0, totalBorrowed - totalRepaid);
    const utilization = currentDebt / totalBorrowed;

    // Optimal utilization is 10-30%
    if (utilization <= 0.1) {
      score = 95;
      rating = "Excellent";
      details = `Very low utilization (${Math.round(
        utilization * 100,
      )}%). Great debt management!`;
    } else if (utilization <= 0.3) {
      score = 90;
      rating = "Excellent";
      details = `Optimal utilization (${Math.round(
        utilization * 100,
      )}%). Keep it up!`;
    } else if (utilization <= 0.5) {
      score = 75;
      rating = "Good";
      details = `Moderate utilization (${Math.round(
        utilization * 100,
      )}%). Consider paying down some debt.`;
    } else if (utilization <= 0.7) {
      score = 50;
      rating = "Fair";
      details = `High utilization (${Math.round(
        utilization * 100,
      )}%). Try to reduce outstanding debt.`;
    } else if (utilization <= 0.9) {
      score = 30;
      rating = "Poor";
      details = `Very high utilization (${Math.round(
        utilization * 100,
      )}%). Prioritize debt repayment.`;
    } else {
      score = 10;
      rating = "Poor";
      details = `Critical utilization (${Math.round(
        utilization * 100,
      )}%). Immediate action needed.`;
    }
  }

  return {
    score,
    weighted: (score / 100) * WEIGHTS.creditUtilization,
    weight: WEIGHTS.creditUtilization,
    rating,
    details,
  };
}

/**
 * Account History (15% of score)
 * Based on age of oldest DeFi activity
 */
function calculateAccountHistoryScore(metrics: CreditMetrics): ComponentScore {
  const { oldestActivityDays } = metrics;

  let score: number;
  let rating: ComponentScore["rating"];
  let details: string;

  if (oldestActivityDays === 0) {
    score = 20;
    rating = "Poor";
    details = "New account. Credit history will improve with time.";
  } else if (oldestActivityDays < 30) {
    score = 30;
    rating = "Poor";
    details = `Account is ${oldestActivityDays} days old. Keep building history!`;
  } else if (oldestActivityDays < 90) {
    score = 50;
    rating = "Fair";
    details = `${Math.round(
      oldestActivityDays / 30,
    )} months of history. Growing nicely!`;
  } else if (oldestActivityDays < 180) {
    score = 65;
    rating = "Good";
    details = `${Math.round(
      oldestActivityDays / 30,
    )} months of established history.`;
  } else if (oldestActivityDays < 365) {
    score = 80;
    rating = "Very Good";
    details = `${Math.round(oldestActivityDays / 30)} months of solid history.`;
  } else {
    score = 95;
    rating = "Excellent";
    details = `${Math.round(
      oldestActivityDays / 365,
    )} year(s) of credit history. Excellent!`;
  }

  return {
    score,
    weighted: (score / 100) * WEIGHTS.accountHistory,
    weight: WEIGHTS.accountHistory,
    rating,
    details,
  };
}

/**
 * Protocol Diversity (10% of score)
 * Based on number of different DeFi protocols used
 */
function calculateDiversityScore(metrics: CreditMetrics): ComponentScore {
  const protocolCount = metrics.uniqueProtocols.size;

  let score: number;
  let rating: ComponentScore["rating"];
  let details: string;

  if (protocolCount === 0) {
    score = 20;
    rating = "Poor";
    details = "No protocol activity yet. Try different DeFi platforms.";
  } else if (protocolCount === 1) {
    score = 40;
    rating = "Fair";
    details = "1 protocol used. Diversifying can improve your score.";
  } else if (protocolCount <= 3) {
    score = 60;
    rating = "Good";
    details = `${protocolCount} protocols used. Good diversification!`;
  } else if (protocolCount <= 5) {
    score = 80;
    rating = "Very Good";
    details = `${protocolCount} protocols used. Well diversified!`;
  } else {
    score = 95;
    rating = "Excellent";
    details = `${protocolCount} protocols used. Excellent diversification!`;
  }

  return {
    score,
    weighted: (score / 100) * WEIGHTS.protocolDiversity,
    weight: WEIGHTS.protocolDiversity,
    rating,
    details,
  };
}

/**
 * Recent Activity (10% of score)
 * Based on transaction frequency and average value
 */
function calculateActivityScore(metrics: CreditMetrics): ComponentScore {
  const { totalTransactions, averageTransactionValue, oldestActivityDays } =
    metrics;

  let score: number;
  let rating: ComponentScore["rating"];
  let details: string;

  if (totalTransactions === 0) {
    score = 20;
    rating = "Poor";
    details = "No transaction activity. Start using DeFi to build credit.";
  } else {
    // Calculate average transactions per month
    const months = Math.max(1, oldestActivityDays / 30);
    const txPerMonth = totalTransactions / months;

    // Score based on activity level
    let activityScore: number;
    if (txPerMonth >= 20) {
      activityScore = 95;
    } else if (txPerMonth >= 10) {
      activityScore = 85;
    } else if (txPerMonth >= 5) {
      activityScore = 70;
    } else if (txPerMonth >= 2) {
      activityScore = 50;
    } else {
      activityScore = 30;
    }

    // Bonus for higher average transaction value
    const valueBonus = Math.min(10, averageTransactionValue / 100);
    score = Math.min(100, activityScore + valueBonus);

    if (score >= 85) {
      rating = "Excellent";
      details = `${totalTransactions} transactions (~${Math.round(
        txPerMonth,
      )}/month). Very active!`;
    } else if (score >= 70) {
      rating = "Very Good";
      details = `${totalTransactions} transactions (~${Math.round(
        txPerMonth,
      )}/month). Good activity!`;
    } else if (score >= 50) {
      rating = "Good";
      details = `${totalTransactions} transactions. Consider more frequent activity.`;
    } else if (score >= 30) {
      rating = "Fair";
      details = `Limited activity (${totalTransactions} transactions). Be more active.`;
    } else {
      rating = "Poor";
      details = `Very low activity. Increase DeFi usage to improve.`;
    }
  }

  return {
    score,
    weighted: (score / 100) * WEIGHTS.recentActivity,
    weight: WEIGHTS.recentActivity,
    rating,
    details,
  };
}

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

/**
 * Get tier from score
 */
export function getTierFromScore(score: number): CreditScoreResult["tier"] {
  if (score >= CREDIT_TIERS.EXCELLENT.min) return "Excellent";
  if (score >= CREDIT_TIERS.VERY_GOOD.min) return "Very Good";
  if (score >= CREDIT_TIERS.GOOD.min) return "Good";
  if (score >= CREDIT_TIERS.FAIR.min) return "Fair";
  return "Poor";
}

/**
 * Get tier color
 */
export function getTierColor(tier: CreditScoreResult["tier"]): string {
  switch (tier) {
    case "Excellent":
      return "#10b981"; // emerald-500
    case "Very Good":
      return "#22c55e"; // green-500
    case "Good":
      return "#eab308"; // yellow-500
    case "Fair":
      return "#f97316"; // orange-500
    case "Poor":
      return "#ef4444"; // red-500
  }
}

/**
 * Generate recommendations based on score breakdown
 */
function generateRecommendations(breakdown: ScoreBreakdown): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Payment history recommendations
  if (breakdown.paymentHistory.score < 70) {
    recommendations.push({
      title: "Improve Payment History",
      description:
        "Focus on making all loan repayments on time to boost your score.",
      icon: "💳",
      impact: 25,
      priority: "high",
    });
  }

  // Utilization recommendations
  if (breakdown.creditUtilization.score < 70) {
    recommendations.push({
      title: "Reduce Credit Utilization",
      description:
        "Pay down some of your outstanding debt to lower your utilization ratio.",
      icon: "📉",
      impact: 20,
      priority: "high",
    });
  }

  // Account history recommendations
  if (breakdown.accountHistory.score < 50) {
    recommendations.push({
      title: "Build Account History",
      description:
        "Keep your accounts active over time. History improves naturally.",
      icon: "📅",
      impact: 10,
      priority: "low",
    });
  }

  // Diversity recommendations
  if (breakdown.protocolDiversity.score < 60) {
    recommendations.push({
      title: "Diversify Protocol Usage",
      description:
        "Try using different DeFi protocols to diversify your credit profile.",
      icon: "🔀",
      impact: 8,
      priority: "medium",
    });
  }

  // Activity recommendations
  if (breakdown.recentActivity.score < 50) {
    recommendations.push({
      title: "Increase Activity",
      description:
        "More frequent DeFi transactions can help improve your score.",
      icon: "⚡",
      impact: 8,
      priority: "medium",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  return recommendations.slice(0, 5); // Return top 5
}

// ===========================================================================
// EXPORTS
// ===========================================================================

export default calculateCreditScore;
