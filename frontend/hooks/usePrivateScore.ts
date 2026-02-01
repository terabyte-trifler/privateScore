/**
 * PRIVATESCORE CUSTOM HOOKS
 *
 * React hooks for managing credit score state, ZK proofs, and blockchain
 * interactions. All credit calculations happen locally in the browser.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram } from "@solana/web3.js";
import {
  getHeliusClient,
  CreditMetrics,
  EnhancedTransaction,
} from "../lib/helius";
import { calculateCreditScore, CreditScoreResult } from "../lib/creditScore";
import {
  generateZKProof,
  CommitmentData,
  createCommitmentData,
  GeneratedProof,
} from "../lib/zkProof";
import { ERROR_MESSAGES, ZK_CONFIG } from "../lib/constants";

// ===========================================================================
// TYPES
// ===========================================================================

interface UsePrivateScoreState {
  creditScore: CreditScoreResult | null;
  commitment: CommitmentData | null;
  metrics: CreditMetrics | null;
  isLoading: boolean;
  error: string | null;
}

interface UsePrivateScoreReturn extends UsePrivateScoreState {
  calculateScore: () => Promise<void>;
  registerCommitment: () => Promise<string>;
  generateProof: (minScore: number, poolId: string) => Promise<GeneratedProof>;
  refreshScore: () => Promise<void>;
  clearError: () => void;
}

// ===========================================================================
// MAIN HOOK: usePrivateScore
// ===========================================================================

export function usePrivateScore(): UsePrivateScoreReturn {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [state, setState] = useState<UsePrivateScoreState>({
    creditScore: null,
    commitment: null,
    metrics: null,
    isLoading: false,
    error: null,
  });

  // Helius client instance
  const heliusClient = useMemo(() => getHeliusClient(), []);

  // =========================================================================
  // Calculate Credit Score
  // =========================================================================

  const calculateScore = useCallback(async () => {
    if (!publicKey || !connected) {
      setState((prev) => ({
        ...prev,
        error: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Fetch credit metrics from Helius
      const metrics = await heliusClient.calculateCreditMetrics(
        publicKey.toBase58(),
      );

      // Step 2: Calculate credit score locally (NEVER sent anywhere!)
      const creditScore = calculateCreditScore(metrics);

      // Step 3: Load existing commitment from localStorage if available
      const storedCommitment = loadCommitmentFromStorage(publicKey.toBase58());

      setState((prev) => ({
        ...prev,
        creditScore,
        metrics,
        commitment: storedCommitment,
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to calculate score";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, [publicKey, connected, heliusClient]);

  // =========================================================================
  // Register Commitment On-Chain
  // =========================================================================

  const registerCommitment = useCallback(async (): Promise<string> => {
    if (!publicKey || !connected || !signTransaction) {
      throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
    }

    if (!state.creditScore) {
      throw new Error("Please calculate your score first");
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Generate commitment data locally
      const commitmentData = createCommitmentData(state.creditScore.score);

      // Step 2: Create transaction to register commitment on-chain
      // In production, this would call the Anchor program
      const transaction = new Transaction();

      // For demo: Create a simple memo transaction
      // In production: Call program.methods.registerCommitment(commitmentData.hash)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0,
        }),
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign and send transaction
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
      );

      // Confirm transaction
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      // Step 3: Store commitment locally (salt is kept secret!)
      saveCommitmentToStorage(publicKey.toBase58(), commitmentData);

      setState((prev) => ({
        ...prev,
        commitment: commitmentData,
        isLoading: false,
      }));

      return signature;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.TRANSACTION_FAILED;
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, [publicKey, connected, signTransaction, connection, state.creditScore]);

  // =========================================================================
  // Generate ZK Proof
  // =========================================================================

  const generateProof = useCallback(
    async (minScore: number, poolId: string): Promise<GeneratedProof> => {
      if (!state.creditScore || !state.commitment) {
        throw new Error("Missing credit score or commitment");
      }

      if (state.creditScore.score < minScore) {
        throw new Error(ERROR_MESSAGES.SCORE_BELOW_THRESHOLD);
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const proof = await generateZKProof({
          score: state.creditScore.score,
          salt: state.commitment.salt,
          commitment: state.commitment.hash,
          minScore,
          poolId,
          nonce: state.commitment.nonce,
        });

        // Update nonce for replay protection
        const updatedCommitment = {
          ...state.commitment,
          nonce: state.commitment.nonce + 1,
        };

        if (publicKey) {
          saveCommitmentToStorage(publicKey.toBase58(), updatedCommitment);
        }

        setState((prev) => ({
          ...prev,
          commitment: updatedCommitment,
          isLoading: false,
        }));

        return {
          proof,
          publicInputs: [
            state.commitment.hash,
            minScore.toString(),
            poolId,
            state.commitment.nonce.toString(),
          ],
          commitment: state.commitment.hash,
          timestamp: Date.now(),
          expiresAt: Date.now() + ZK_CONFIG.PROOF_VALIDITY_SECONDS * 1000,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.PROOF_GENERATION_FAILED;
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        throw error;
      }
    },
    [state.creditScore, state.commitment, publicKey],
  );

  // ═════════════════════════════════════════════════════════════════════════
  // Refresh Score
  // ═════════════════════════════════════════════════════════════════════════

  const refreshScore = useCallback(async () => {
    await calculateScore();
  }, [calculateScore]);

  // ═════════════════════════════════════════════════════════════════════════
  // Clear Error
  // ═════════════════════════════════════════════════════════════════════════

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // Load commitment on wallet connect
  // =========================================================================

  useEffect(() => {
    if (connected && publicKey) {
      const storedCommitment = loadCommitmentFromStorage(publicKey.toBase58());
      if (storedCommitment) {
        // Use a timeout to avoid the synchronous setState warning
        setTimeout(() => {
          setState((prev) => ({ ...prev, commitment: storedCommitment }));
        }, 0);
      }
    }
  }, [connected, publicKey]);

  return {
    ...state,
    calculateScore,
    registerCommitment,
    generateProof,
    refreshScore,
    clearError,
  };
}

// ===========================================================================
// HELPER HOOKS
// ===========================================================================

/**
 * Hook for wallet SOL balance
 */
export function useWalletBalance() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    setLoading(true);
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / 1e9); // Convert to SOL
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, loading, refresh: fetchBalance };
}

/**
 * Hook for token balances via Helius DAS
 */
export function useTokenBalances() {
  const { publicKey, connected } = useWallet();
  const [tokens, setTokens] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const heliusClient = useMemo(() => getHeliusClient(), []);

  const fetchTokens = useCallback(async () => {
    if (!publicKey || !connected) {
      setTokens([]);
      return;
    }

    setLoading(true);
    try {
      const tokenBalances = await heliusClient.getTokenBalances(
        publicKey.toBase58(),
      );
      setTokens(tokenBalances);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, heliusClient]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, loading, refresh: fetchTokens };
}

/**
 * Hook for transaction history
 */
export function useTransactionHistory(limit = 20) {
  const { publicKey, connected } = useWallet();
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const heliusClient = useMemo(() => getHeliusClient(), []);

  const fetchTransactions = useCallback(async () => {
    if (!publicKey || !connected) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    try {
      const txs = await heliusClient.getEnhancedTransactions(
        publicKey.toBase58(),
        { limit },
      );
      setTransactions(txs);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, heliusClient, limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, refresh: fetchTransactions };
}

/**
 * Hook for collateral calculation
 */
export function useCollateralCalculation(
  borrowAmount: number,
  isVerified: boolean,
) {
  const collateralRatio = isVerified ? 1.2 : 1.5; // 120% vs 150%
  const collateralRequired = borrowAmount * collateralRatio;
  const savings = borrowAmount * 0.3; // 30% savings

  return {
    collateralRatio,
    collateralRequired,
    savings: isVerified ? savings : 0,
    savingsPercent: isVerified ? 30 : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY_PREFIX = "privatescore_commitment_";

function saveCommitmentToStorage(
  address: string,
  commitment: CommitmentData,
): void {
  if (typeof window === "undefined") return;

  try {
    const key = STORAGE_KEY_PREFIX + address;
    localStorage.setItem(key, JSON.stringify(commitment));
  } catch (error) {
    console.error("Failed to save commitment to storage:", error);
  }
}

function loadCommitmentFromStorage(address: string): CommitmentData | null {
  if (typeof window === "undefined") return null;

  try {
    const key = STORAGE_KEY_PREFIX + address;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    const commitment = JSON.parse(stored) as CommitmentData;

    // Check if commitment has expired
    if (commitment.expiresIn <= 0) {
      localStorage.removeItem(key);
      return null;
    }

    return commitment;
  } catch (error) {
    console.error("Failed to load commitment from storage:", error);
    return null;
  }
}

// ===========================================================================
// EXPORTS
// ===========================================================================

export default usePrivateScore;
