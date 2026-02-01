"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Lock,
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { ScoreDisplay } from "../../components/ScoreDisplay";
import { usePrivateScore } from "../../hooks/usePrivateScore";
import { generateZKProof } from "../../lib/zkProof";
import {
  COLLATERAL_RATIOS,
  LENDING_POOLS,
  getExplorerUrl,
} from "../../lib/constants";

// Step definitions
const STEPS = [
  { id: 1, title: "Select Pool", description: "Choose a lending pool" },
  { id: 2, title: "Enter Amount", description: "Specify loan amount" },
  { id: 3, title: "Generate Proof", description: "Create ZK proof" },
  { id: 4, title: "Confirm", description: "Review and submit" },
  { id: 5, title: "Success", description: "Loan complete" },
];

export default function BorrowPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { creditScore, commitment } = usePrivateScore();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [zkProof, setZkProof] = useState<string | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not connected
  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  // Calculate collateral requirement
  const calculateCollateral = (amount: number, isVerified: boolean) => {
    const ratio = isVerified
      ? COLLATERAL_RATIOS.CREDIT_VERIFIED
      : COLLATERAL_RATIOS.BASE;
    return (amount * ratio) / 10000;
  };

  const amount = parseFloat(borrowAmount) || 0;
  const isEligibleForReduced =
    creditScore && creditScore.score >= 650 && commitment;
  const collateralRequired = calculateCollateral(
    amount,
    !!isEligibleForReduced,
  );
  const standardCollateral = calculateCollateral(amount, false);
  const savings = standardCollateral - collateralRequired;

  // Get selected pool info
  const poolInfo = selectedPool
    ? LENDING_POOLS.find((p: { id: string }) => p.id === selectedPool)
    : null;

  // Step navigation
  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  // Handle proof generation
  const handleGenerateProof = async () => {
    if (!creditScore || !commitment) {
      setError("Missing credit score or commitment");
      return;
    }

    setIsGeneratingProof(true);
    setError(null);

    try {
      const proof = await generateZKProof({
        score: creditScore.score,
        salt: commitment.salt,
        commitment: commitment.hash,
        minScore: poolInfo?.minScore || 650,
        poolId: selectedPool!,
        nonce: commitment.nonce,
      });

      setZkProof(proof);
      toast.success("ZK Proof generated successfully!");
      nextStep();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate proof";
      setError(message);
      toast.error(message);
    } finally {
      setIsGeneratingProof(false);
    }
  };

  // Handle loan submission
  const handleSubmitLoan = async () => {
    if (!zkProof || !selectedPool || !amount) {
      setError("Missing required data");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // In production, this would submit to the Solana program
      // For demo, we simulate a successful transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockSignature =
        "DEMO" +
        Array.from({ length: 84 }, () =>
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
            Math.floor(Math.random() * 62),
          ),
        ).join("");

      setTxSignature(mockSignature);
      toast.success("Loan created successfully!");
      nextStep();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">
              Select Lending Pool
            </h2>
            <p className="text-gray-400">Choose a pool to borrow from</p>

            <div className="grid gap-4">
              {LENDING_POOLS.map(
                (pool: {
                  id: string;
                  name: string;
                  description: string;
                  apy: number;
                  tvl: string;
                  minScore: number;
                  maxLTV: number;
                  token: string;
                }) => (
                  <button
                    key={pool.id}
                    onClick={() => setSelectedPool(pool.id)}
                    className={`p-6 rounded-xl border text-left transition-all ${
                      selectedPool === pool.id
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {pool.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {pool.description}
                        </p>
                      </div>
                      {selectedPool === pool.id && (
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">APY</p>
                        <p className="text-green-400 font-semibold">
                          {pool.apy}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">TVL</p>
                        <p className="text-white font-semibold">${pool.tvl}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Min Score</p>
                        <p className="text-white font-semibold">
                          {pool.minScore}
                        </p>
                      </div>
                    </div>
                  </button>
                ),
              )}
            </div>

            <button
              onClick={nextStep}
              disabled={!selectedPool}
              className="btn-primary w-full justify-center"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Enter Loan Amount</h2>
            <p className="text-gray-400">
              Specify how much you want to borrow from {poolInfo?.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Borrow Amount (USDC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="input text-2xl h-16 pr-20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                    USDC
                  </span>
                </div>
              </div>

              {amount > 0 && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-white">Loan Summary</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Borrow Amount</span>
                      <span className="text-white font-semibold">
                        ${amount.toFixed(2)} USDC
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Interest Rate</span>
                      <span className="text-white">{poolInfo?.apy}% APY</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Collateral Ratio</span>
                      <span
                        className={
                          isEligibleForReduced
                            ? "text-green-400 font-semibold"
                            : "text-white"
                        }
                      >
                        {isEligibleForReduced ? "120%" : "150%"}
                        {isEligibleForReduced && (
                          <span className="text-gray-500 line-through ml-2 text-sm">
                            150%
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="border-t border-gray-700 pt-3 flex justify-between">
                      <span className="text-gray-400">Required Collateral</span>
                      <span className="text-white font-bold text-lg">
                        ${collateralRequired.toFixed(2)} SOL
                      </span>
                    </div>

                    {isEligibleForReduced && savings > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>You Save</span>
                        <span className="font-semibold">
                          ${savings.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isEligibleForReduced && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 font-medium">
                        Standard Collateral Rate
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Register your credit commitment on the dashboard to
                        unlock reduced collateral rates.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={prevStep}
                className="btn-secondary flex-1 justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!amount || amount <= 0}
                className="btn-primary flex-1 justify-center"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Generate ZK Proof</h2>
            <p className="text-gray-400">
              Create a zero-knowledge proof that your credit score meets the
              pool requirements
            </p>

            {creditScore && (
              <div className="flex items-center justify-center py-8">
                <ScoreDisplay score={creditScore.score} size="md" showPrivacy />
              </div>
            )}

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">
                What You&apos;re Proving
              </h3>

              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">
                    Your credit score ≥ {poolInfo?.minScore || 650}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">
                    Commitment matches your registered hash
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">
                    Proof is bound to this specific loan request
                  </span>
                </li>
              </ul>

              <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-purple-400 font-medium">
                      Privacy Protected
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      The verifier will only learn that your score meets the
                      threshold — not your actual score, income, or any other
                      financial details.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={prevStep}
                className="btn-secondary flex-1 justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleGenerateProof}
                disabled={isGeneratingProof || !commitment}
                className="btn-primary flex-1 justify-center"
              >
                {isGeneratingProof ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Proof...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Generate ZK Proof
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Review & Confirm</h2>
            <p className="text-gray-400">
              Review your loan details before submitting
            </p>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl divide-y divide-gray-700">
              <div className="p-6">
                <h3 className="font-semibold text-white mb-4">Loan Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pool</span>
                    <span className="text-white">{poolInfo?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Borrow Amount</span>
                    <span className="text-white font-semibold">
                      ${amount.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Interest Rate</span>
                    <span className="text-white">{poolInfo?.apy}% APY</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-semibold text-white mb-4">Collateral</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Collateral Ratio</span>
                    <span className="text-green-400 font-semibold">120%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Required Collateral</span>
                    <span className="text-white font-bold">
                      ${collateralRequired.toFixed(2)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-green-400">
                    <span>Savings vs Standard</span>
                    <span className="font-semibold">${savings.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-semibold text-white mb-4">ZK Proof</h3>
                <div className="p-3 bg-gray-900 rounded-lg font-mono text-xs text-green-400 break-all">
                  {zkProof?.slice(0, 64)}...
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Proof will be verified on-chain via Sunspot verifier
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={prevStep}
                className="btn-secondary flex-1 justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSubmitLoan}
                disabled={isSubmitting}
                className="btn-primary flex-1 justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm Loan
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-green-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Loan Created!
              </h2>
              <p className="text-gray-400">
                Your loan has been successfully created with reduced collateral
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-left space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Amount Borrowed</span>
                <span className="text-white font-semibold">
                  ${amount.toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Collateral Locked</span>
                <span className="text-white font-semibold">
                  ${collateralRequired.toFixed(2)} SOL
                </span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>You Saved</span>
                <span className="font-semibold">${savings.toFixed(2)}</span>
              </div>
            </div>

            {txSignature && (
              <a
                href={getExplorerUrl(txSignature, "tx")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
              >
                View on Explorer
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <div className="flex gap-4 pt-4">
              <Link
                href="/dashboard"
                className="btn-secondary flex-1 justify-center"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setSelectedPool(null);
                  setBorrowAmount("");
                  setZkProof(null);
                  setTxSignature(null);
                }}
                className="btn-primary flex-1 justify-center"
              >
                Borrow Again
              </button>
            </div>
          </div>
        );

      default:
        return null;
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
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-purple-500" />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent">
                PrivateScore
              </span>
            </Link>

            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-xl !h-10" />
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`step-indicator ${
                      currentStep > step.id
                        ? "completed"
                        : currentStep === step.id
                        ? "active"
                        : "pending"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 hidden sm:block ${
                      currentStep >= step.id ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {index < STEPS.length - 1 && (
                  <div
                    className={`step-connector ${
                      currentStep > step.id ? "completed" : "pending"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-8">
          {renderStepContent()}
        </div>
      </main>
    </div>
  );
}
