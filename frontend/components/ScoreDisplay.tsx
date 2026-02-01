"use client";

/**
 * SCORE DISPLAY COMPONENTS
 *
 * Reusable components for displaying credit scores with:
 * - Animated circular progress ring
 * - Tier badges and colors
 * - Score breakdown visualization
 * - Privacy indicators
 */

import { FC, useMemo } from "react";
import { Lock, Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CREDIT_SCORE, CREDIT_TIERS } from "@/lib/constants";
import { ScoreBreakdown as BreakdownType } from "@/lib/creditScore";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ScoreDisplayProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showPrivacy?: boolean;
  animated?: boolean;
}

interface TierBadgeProps {
  tier: "Poor" | "Fair" | "Good" | "Very Good" | "Excellent";
  size?: "sm" | "md" | "lg";
}

interface ScoreBreakdownProps {
  breakdown: BreakdownType;
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE DISPLAY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ScoreDisplay: FC<ScoreDisplayProps> = ({
  score,
  size = "md",
  showPrivacy = false,
  animated = true,
}) => {
  // Calculate dimensions based on size
  const dimensions = useMemo(() => {
    switch (size) {
      case "sm":
        return { size: 120, stroke: 8, fontSize: "2rem" };
      case "lg":
        return { size: 200, stroke: 12, fontSize: "3.5rem" };
      default:
        return { size: 160, stroke: 10, fontSize: "2.75rem" };
    }
  }, [size]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    const normalized =
      (score - CREDIT_SCORE.MIN) / (CREDIT_SCORE.MAX - CREDIT_SCORE.MIN);
    return Math.max(0, Math.min(1, normalized)) * 100;
  }, [score]);

  // Get tier and color
  const tier = useMemo(() => {
    if (score >= CREDIT_TIERS.EXCELLENT.min) return CREDIT_TIERS.EXCELLENT;
    if (score >= CREDIT_TIERS.VERY_GOOD.min) return CREDIT_TIERS.VERY_GOOD;
    if (score >= CREDIT_TIERS.GOOD.min) return CREDIT_TIERS.GOOD;
    if (score >= CREDIT_TIERS.FAIR.min) return CREDIT_TIERS.FAIR;
    return CREDIT_TIERS.POOR;
  }, [score]);

  // SVG calculations
  const { size: ringSize, stroke } = dimensions;
  const radius = (ringSize - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* SVG Ring */}
      <div className="relative" style={{ width: ringSize, height: ringSize }}>
        <svg
          width={ringSize}
          height={ringSize}
          className="transform -rotate-90"
        >
          {/* Gradient Definition */}
          <defs>
            <linearGradient
              id="scoreGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Background Circle */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={stroke}
          />

          {/* Progress Circle */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? strokeDashoffset : 0}
            style={{
              transition: animated ? "stroke-dashoffset 1s ease-out" : "none",
            }}
          />
        </svg>

        {/* Score Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="font-bold bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent"
            style={{ fontSize: dimensions.fontSize }}
          >
            {score}
          </div>
          <div className="text-gray-500 text-sm">out of 850</div>
        </div>
      </div>

      {/* Privacy Badge */}
      {showPrivacy && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <Lock className="w-4 h-4 text-green-400" />
          <span>Score calculated locally</span>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TIER BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const TierBadge: FC<TierBadgeProps> = ({ tier, size = "md" }) => {
  const tierConfig = useMemo(() => {
    switch (tier) {
      case "Excellent":
        return CREDIT_TIERS.EXCELLENT;
      case "Very Good":
        return CREDIT_TIERS.VERY_GOOD;
      case "Good":
        return CREDIT_TIERS.GOOD;
      case "Fair":
        return CREDIT_TIERS.FAIR;
      default:
        return CREDIT_TIERS.POOR;
    }
  }, [tier]);

  const sizeClasses = useMemo(() => {
    switch (size) {
      case "sm":
        return "px-2 py-1 text-xs";
      case "lg":
        return "px-4 py-2 text-base";
      default:
        return "px-3 py-1.5 text-sm";
    }
  }, [size]);

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClasses}`}
      style={{
        backgroundColor: `${tierConfig.color}20`,
        color: tierConfig.color,
        border: `1px solid ${tierConfig.color}`,
      }}
    >
      {tier}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCORE BREAKDOWN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ScoreBreakdown: FC<ScoreBreakdownProps> = ({ breakdown }) => {
  const categories = useMemo(
    () => [
      {
        key: "paymentHistory",
        label: "Payment History",
        data: breakdown.paymentHistory,
        icon: "💳",
      },
      {
        key: "creditUtilization",
        label: "Credit Utilization",
        data: breakdown.creditUtilization,
        icon: "📊",
      },
      {
        key: "accountHistory",
        label: "Account History",
        data: breakdown.accountHistory,
        icon: "📅",
      },
      {
        key: "protocolDiversity",
        label: "Protocol Diversity",
        data: breakdown.protocolDiversity,
        icon: "🔀",
      },
      {
        key: "recentActivity",
        label: "Recent Activity",
        data: breakdown.recentActivity,
        icon: "⚡",
      },
    ],
    [breakdown],
  );

  return (
    <div className="space-y-4">
      {categories.map(({ key, label, data, icon }) => (
        <div key={key} className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{icon}</span>
              <span className="text-white font-medium">{label}</span>
              <span className="text-gray-500 text-sm">({data.weight}%)</span>
            </div>
            <TierBadge tier={data.rating} size="sm" />
          </div>

          <ProgressBar
            value={data.score}
            max={100}
            color={getTierColorFromRating(data.rating)}
          />

          <p className="text-sm text-gray-400 mt-2">{data.details}</p>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ProgressBar: FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = "#a855f7",
  label,
  showValue = true,
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-gray-400">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium" style={{ color }}>
              {Math.round(value)}/{max}
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ScoreCardProps {
  score: number;
  tier: string;
  trend?: "up" | "down" | "stable";
  trendValue?: number;
  lastUpdated?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ScoreCard: FC<ScoreCardProps> = ({
  score,
  tier,
  trend = "stable",
  trendValue = 0,
  lastUpdated,
  onRefresh,
  isLoading = false,
}) => {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-green-400"
      : trend === "down"
      ? "text-red-400"
      : "text-gray-400";

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Credit Score
          </h3>
          <p className="text-sm text-gray-400">Based on on-chain activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          <span className="text-sm text-gray-500">Private</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <ScoreDisplay score={score} size="md" />

        <div className="text-right">
          <TierBadge
            tier={tier as "Poor" | "Fair" | "Good" | "Very Good" | "Excellent"}
            size="lg"
          />

          {trendValue !== 0 && (
            <div className={`flex items-center gap-1 mt-3 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {trend === "up" ? "+" : ""}
                {trendValue} pts
              </span>
            </div>
          )}

          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-2">
              Updated {new Date(lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="mt-6 w-full py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-xl transition-colors disabled:opacity-50"
        >
          {isLoading ? "Refreshing..." : "Refresh Score"}
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MINI SCORE DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

interface MiniScoreProps {
  score: number;
  showTier?: boolean;
}

export const MiniScore: FC<MiniScoreProps> = ({ score, showTier = true }) => {
  const tier = useMemo(() => {
    if (score >= CREDIT_TIERS.EXCELLENT.min) return CREDIT_TIERS.EXCELLENT;
    if (score >= CREDIT_TIERS.VERY_GOOD.min) return CREDIT_TIERS.VERY_GOOD;
    if (score >= CREDIT_TIERS.GOOD.min) return CREDIT_TIERS.GOOD;
    if (score >= CREDIT_TIERS.FAIR.min) return CREDIT_TIERS.FAIR;
    return CREDIT_TIERS.POOR;
  }, [score]);

  return (
    <div className="inline-flex items-center gap-2">
      <div className="text-2xl font-bold" style={{ color: tier.color }}>
        {score}
      </div>
      {showTier && (
        <span
          className="text-sm px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${tier.color}20`,
            color: tier.color,
          }}
        >
          {tier.name}
        </span>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCORE GAUGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ScoreGaugeProps {
  score: number;
  width?: number;
  height?: number;
}

export const ScoreGauge: FC<ScoreGaugeProps> = ({
  score,
  width = 300,
  height = 80,
}) => {
  const position =
    ((score - CREDIT_SCORE.MIN) / (CREDIT_SCORE.MAX - CREDIT_SCORE.MIN)) * 100;

  return (
    <div className="relative" style={{ width, height }}>
      {/* Gradient Background */}
      <div
        className="absolute top-0 left-0 right-0 h-4 rounded-full"
        style={{
          background:
            "linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #10b981)",
        }}
      />

      {/* Score Marker */}
      <div
        className="absolute top-0 w-1 h-6 bg-white rounded-full shadow-lg transform -translate-x-1/2 transition-all duration-500"
        style={{ left: `${position}%` }}
      />

      {/* Score Labels */}
      <div className="absolute top-8 left-0 right-0 flex justify-between text-xs text-gray-500">
        <span>300</span>
        <span>580</span>
        <span>670</span>
        <span>740</span>
        <span>850</span>
      </div>

      {/* Tier Labels */}
      <div className="absolute top-14 left-0 right-0 flex justify-between text-xs">
        <span className="text-red-400">Poor</span>
        <span className="text-orange-400">Fair</span>
        <span className="text-yellow-400">Good</span>
        <span className="text-green-400">V.Good</span>
        <span className="text-emerald-400">Excellent</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getTierColorFromRating(rating: string): string {
  switch (rating) {
    case "Excellent":
      return CREDIT_TIERS.EXCELLENT.color;
    case "Very Good":
      return CREDIT_TIERS.VERY_GOOD.color;
    case "Good":
      return CREDIT_TIERS.GOOD.color;
    case "Fair":
      return CREDIT_TIERS.FAIR.color;
    default:
      return CREDIT_TIERS.POOR.color;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default ScoreDisplay;
