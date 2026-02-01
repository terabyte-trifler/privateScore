"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Shield,
  Lock,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  ScoreDisplay,
  TierBadge,
  ScoreBreakdown,
} from "../../components/ScoreDisplay";
import { usePrivateScore } from "../../hooks/usePrivateScore";

export default function DashboardPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const {
    creditScore,
    isLoading,
    error,
    commitment,
    calculateScore,
    registerCommitment,
  } = usePrivateScore();

  const [isRegistering, setIsRegistering] = useState(false);

  // Redirect if not connected
  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  // Calculate score on mount
  useEffect(() => {
    if (connected && publicKey) {
      calculateScore();
    }
  }, [connected, publicKey, calculateScore]);

  // Handle commitment registration
  const handleRegisterCommitment = async () => {
    if (!creditScore) {
      toast.error("Please calculate your score first");
      return;
    }

    setIsRegistering(true);
    try {
      await registerCommitment();
      toast.success("Credit commitment registered on-chain!");
    } catch (err) {
      toast.error("Failed to register commitment");
      console.error(err);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h1>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Credit Dashboard
          </h1>
          <p className="text-gray-400">
            Your privacy-preserving credit score and verification status
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Score Card */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="loading-spinner w-12 h-12 mb-4" />
                  <p className="text-gray-400">
                    Calculating your credit score...
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Analyzing on-chain DeFi activity via Helius
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-400 mb-4">{error}</p>
                  <button onClick={calculateScore} className="btn-secondary">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              ) : creditScore ? (
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Score Ring */}
                  <ScoreDisplay score={creditScore.score} size="lg" />

                  {/* Score Info */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                      <TierBadge tier={creditScore.tier} />
                      {creditScore.trend === "up" && (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <TrendingUp className="w-4 h-4" />
                          +12 pts
                        </span>
                      )}
                    </div>

                    <p className="text-gray-400 mb-6">
                      Your credit score is calculated from your on-chain DeFi
                      activity including loan repayments, utilization, and
                      account history.
                    </p>

                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                      <Lock className="w-4 h-4 text-green-400" />
                      <span>Score calculated locally — never shared</span>
                    </div>

                    <button onClick={calculateScore} className="btn-secondary">
                      <RefreshCw className="w-4 h-4" />
                      Recalculate Score
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">
                    Click below to calculate your credit score
                  </p>
                  <button onClick={calculateScore} className="btn-primary">
                    Calculate My Score
                  </button>
                </div>
              )}
            </div>

            {/* Score Breakdown */}
            {creditScore && (
              <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Score Breakdown
                </h2>
                <ScoreBreakdown breakdown={creditScore.breakdown} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Commitment Status */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                Commitment Status
              </h3>

              {commitment ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-green-400 font-medium">Registered</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {commitment.hash.slice(0, 8)}...
                        {commitment.hash.slice(-8)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Expires in {commitment.expiresIn} days</span>
                  </div>

                  <Link
                    href="/borrow"
                    className="btn-primary w-full justify-center"
                  >
                    Borrow with ZK Proof
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Register your credit commitment on-chain to enable
                    ZK-verified borrowing.
                  </p>

                  <button
                    onClick={handleRegisterCommitment}
                    disabled={!creditScore || isRegistering}
                    className="btn-primary w-full justify-center"
                  >
                    {isRegistering ? (
                      <>
                        <div className="loading-spinner w-4 h-4" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Register Commitment
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Collateral Benefits */}
            {creditScore && creditScore.score >= 650 && (
              <div className="bg-gradient-to-br from-purple-500/10 to-green-500/10 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  🎉 You Qualify!
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Standard Collateral</span>
                    <span className="text-gray-400 line-through">150%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">
                      Your Collateral
                    </span>
                    <span className="text-green-400 font-bold text-xl">
                      120%
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <span className="text-gray-400">You Save</span>
                    <span className="text-purple-400 font-semibold">
                      30% on locked capital
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-900/50 rounded-xl">
                  <p className="text-sm text-gray-400">
                    <Info className="w-4 h-4 inline mr-1" />
                    On a $1,000 loan, you save{" "}
                    <span className="text-green-400 font-semibold">
                      $300
                    </span>{" "}
                    in collateral requirements.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Quick Actions
              </h3>

              <div className="space-y-3">
                <Link
                  href="/borrow"
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors"
                >
                  <span className="text-white">Borrow with ZK Proof</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>

                <a
                  href="https://explorer.solana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors"
                >
                  <span className="text-white">View on Explorer</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <h4 className="text-white font-medium mb-2">
                    Privacy Protected
                  </h4>
                  <p className="text-sm text-gray-400">
                    Your credit score is calculated entirely in your browser.
                    Only a cryptographic commitment is stored on-chain — your
                    actual score remains private.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {creditScore && creditScore.recommendations && (
          <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6">
              Recommendations to Improve Your Score
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creditScore.recommendations.map(
                (
                  rec: {
                    icon: string;
                    title: string;
                    description: string;
                    impact?: number;
                  },
                  index: number,
                ) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-700/30 rounded-xl border border-gray-600/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{rec.icon}</span>
                      <span className="text-white font-medium">
                        {rec.title}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{rec.description}</p>
                    {rec.impact && (
                      <p className="text-xs text-green-400 mt-2">
                        Potential impact: +{rec.impact} pts
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
