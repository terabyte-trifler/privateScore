/**
 * ===========================================================================
 * PRIVATESCORE CONSTANTS & CONFIGURATION
 * ===========================================================================
 *
 * Centralized configuration for the entire application.
 * All constants, program IDs, and shared values live here.
 */

import { PublicKey, clusterApiUrl, Commitment } from "@solana/web3.js";

// ===========================================================================
// ENVIRONMENT CONFIGURATION
// ===========================================================================

export const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet") as
  | "devnet"
  | "mainnet-beta"
  | "testnet";

export const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || "";

export const COMMITMENT: Commitment = "confirmed";

// ===========================================================================
// RPC ENDPOINTS
// ===========================================================================

export const HELIUS_RPC_URL = HELIUS_API_KEY
  ? `https://${NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : clusterApiUrl(NETWORK);

export const HELIUS_API_URL =
  NETWORK === "mainnet-beta"
    ? "https://api.helius.xyz"
    : "https://api-devnet.helius.xyz";

// Fallback RPC endpoints
export const RPC_ENDPOINTS = {
  devnet: [
    HELIUS_RPC_URL,
    "https://api.devnet.solana.com",
    "https://devnet.genesysgo.net",
  ],
  "mainnet-beta": [HELIUS_RPC_URL, "https://api.mainnet-beta.solana.com"],
  testnet: ["https://api.testnet.solana.com"],
};

// ===========================================================================
// PROGRAM IDS
// ===========================================================================

export const PROGRAM_IDS = {
  // PrivateScore main program
  PRIVATE_SCORE: new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID || "11111111111111111111111111111111",
  ),

  // System programs
  SYSTEM_PROGRAM: new PublicKey("11111111111111111111111111111111"),
  TOKEN_PROGRAM: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  ASSOCIATED_TOKEN: new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  ),
};

// ===========================================================================
// TOKEN MINTS
// ===========================================================================

export const TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  USDC:
    NETWORK === "mainnet-beta"
      ? new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
      : new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
};

// ===========================================================================
// CREDIT SCORE CONFIGURATION
// ===========================================================================

export const CREDIT_SCORE = {
  MIN: 300,
  MAX: 850,
  DEFAULT_THRESHOLD: 650,

  WEIGHTS: {
    PAYMENT_HISTORY: 35,
    UTILIZATION: 30,
    HISTORY: 15,
    DIVERSITY: 10,
    ACTIVITY: 10,
  },
};

// ===========================================================================
// CREDIT TIERS
// ===========================================================================

export const CREDIT_TIERS = {
  EXCELLENT: { min: 800, max: 850, name: "Excellent", color: "#10b981" },
  VERY_GOOD: { min: 740, max: 799, name: "Very Good", color: "#22c55e" },
  GOOD: { min: 670, max: 739, name: "Good", color: "#eab308" },
  FAIR: { min: 580, max: 669, name: "Fair", color: "#f97316" },
  POOR: { min: 300, max: 579, name: "Poor", color: "#ef4444" },
};

// ===========================================================================
// COLLATERAL RATIOS
// ===========================================================================

export const COLLATERAL_RATIOS = {
  BASE: 15000, // 150% standard
  CREDIT_VERIFIED: 12000, // 120% with credit proof
  MINIMUM: 11000, // 110% minimum
  LIQUIDATION: 11000,
};

export const COLLATERAL_SAVINGS =
  ((COLLATERAL_RATIOS.BASE - COLLATERAL_RATIOS.CREDIT_VERIFIED) /
    COLLATERAL_RATIOS.BASE) *
  100;

// ===========================================================================
// LENDING POOLS
// ===========================================================================

export interface LendingPool {
  id: string;
  name: string;
  description: string;
  token: string;
  apy: number;
  tvl: string;
  minScore: number;
  maxLTV: number;
}

export const LENDING_POOLS: LendingPool[] = [
  {
    id: "usdc-prime",
    name: "USDC Prime Pool",
    description: "Low-risk USDC lending with stable yields",
    token: "USDC",
    apy: 5.2,
    tvl: "2.4M",
    minScore: 650,
    maxLTV: 80,
  },
  {
    id: "sol-yield",
    name: "SOL Yield Pool",
    description: "Native SOL lending with competitive rates",
    token: "SOL",
    apy: 7.8,
    tvl: "1.8M",
    minScore: 680,
    maxLTV: 75,
  },
  {
    id: "defi-max",
    name: "DeFi Max Pool",
    description: "Higher yields for experienced DeFi users",
    token: "USDC",
    apy: 9.5,
    tvl: "850K",
    minScore: 720,
    maxLTV: 85,
  },
];

// ===========================================================================
// ZK PROOF CONFIGURATION
// ===========================================================================

export const ZK_CONFIG = {
  PROOF_VALIDITY_SECONDS: 3600,
  COMMITMENT_EXPIRY_DAYS: 30,
  CIRCUITS: {
    SCORE_THRESHOLD: "prove_score_threshold",
    DTI_RATIO: "prove_dti_ratio",
    PAYMENT_HISTORY: "prove_payment_history",
    CREDITWORTHY: "prove_creditworthy",
  },
};

// ===========================================================================
// UI CONFIGURATION
// ===========================================================================

export const UI_CONFIG = {
  SCORE_ANIMATION_DURATION: 1500,
  TOAST_DURATION: 5000,
  INPUT_DEBOUNCE: 300,
  BALANCE_REFRESH_INTERVAL: 15000,
  SCORE_REFRESH_INTERVAL: 60000,
};

// ===========================================================================
// EXPLORER URLS
// ===========================================================================

export const EXPLORER_BASE_URL = "https://explorer.solana.com";

export function getExplorerUrl(
  signature: string,
  type: "tx" | "address" | "block" = "tx",
): string {
  const cluster = NETWORK === "mainnet-beta" ? "" : `?cluster=${NETWORK}`;
  return `${EXPLORER_BASE_URL}/${type}/${signature}${cluster}`;
}

// ===========================================================================
// ERROR MESSAGES
// ===========================================================================

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Please connect your wallet to continue",
  INSUFFICIENT_BALANCE: "Insufficient balance for this transaction",
  SCORE_BELOW_THRESHOLD:
    "Your credit score does not meet the minimum requirement",
  PROOF_GENERATION_FAILED: "Failed to generate ZK proof. Please try again.",
  PROOF_VERIFICATION_FAILED: "Proof verification failed on-chain",
  COMMITMENT_EXPIRED:
    "Your credit commitment has expired. Please register again.",
  TRANSACTION_FAILED:
    "Transaction failed. Please check your balance and try again.",
  NETWORK_ERROR: "Network error. Please check your connection.",
};

// ===========================================================================
// FEATURE FLAGS
// ===========================================================================

export const FEATURES = {
  ENABLE_REAL_TRANSACTIONS: process.env.NEXT_PUBLIC_ENABLE_REAL_TX === "true",
  DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
};

const constants = {
  NETWORK,
  HELIUS_API_KEY,
  HELIUS_RPC_URL,
  PROGRAM_IDS,
  TOKEN_MINTS,
  CREDIT_SCORE,
  CREDIT_TIERS,
  COLLATERAL_RATIOS,
  LENDING_POOLS,
  ZK_CONFIG,
  UI_CONFIG,
  FEATURES,
  getExplorerUrl,
};

export default constants;
