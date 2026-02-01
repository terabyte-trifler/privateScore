"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Lock, ArrowRight } from "lucide-react";
import { getHeliusClient } from "../lib/helius";
import { calculateCreditScore, CreditScoreResult } from "../lib/creditScore";

export default function HomePage() {
  const { publicKey, connected } = useWallet();
  const [creditScore, setCreditScore] = useState<CreditScoreResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const calculateScore = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const helius = getHeliusClient();
      const metrics = await helius.calculateCreditMetrics(publicKey.toBase58());
      const result = calculateCreditScore(metrics);
      setCreditScore(result);
    } catch (err) {
      console.error("Error calculating credit score:", err);
      // You could add toast notification here if needed
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">
            Welcome to PrivateScore
          </h1>
          <p className="text-gray-400">
            Please connect your wallet to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white">
          Your Credit Dashboard
        </h1>

        {!creditScore ? (
          <div className="text-center py-12">
            <button
              onClick={calculateScore}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Calculating..." : "Calculate Credit Score"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score Display */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="text-6xl font-bold text-purple-400 mb-2">
                  {creditScore.score}
                </div>
                <div className="text-xl text-gray-300 mb-4">
                  {creditScore.tier}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Lock className="w-4 h-4" />
                  <span>Score calculated locally • Never shared</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-white">
                Score Breakdown
              </h2>
              <div className="space-y-4">
                {Object.entries(creditScore.breakdown).map(
                  ([key, component]) => (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-300">{key}</span>
                        <span className="text-gray-400">
                          {component.rating}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${component.score}%` }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="text-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                View Full Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
