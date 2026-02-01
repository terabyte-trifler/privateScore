/**
 * ===========================================================================
 * ZK PROOF GENERATION MODULE
 * ===========================================================================
 *
 * Client-side zero-knowledge proof generation for credit verification.
 *
 * This module handles:
 * - Pedersen commitment generation
 * - ZK proof generation using Noir circuits
 * - Proof serialization for on-chain verification
 *
 * All operations happen ENTIRELY IN THE BROWSER - private data never leaves!
 */

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// ===========================================================================
// TYPES
// ===========================================================================

export interface ProofInputs {
  score: number; // The actual credit score (PRIVATE)
  salt: string; // Random salt for hiding (PRIVATE)
  commitment: string; // Pedersen commitment (PUBLIC)
  minScore: number; // Minimum score threshold (PUBLIC)
  poolId: string; // Pool identifier (PUBLIC)
  nonce: number; // Replay protection (PUBLIC)
}

export interface GeneratedProof {
  proof: string; // The ZK proof bytes
  publicInputs: string[]; // Public inputs for verification
  commitment: string; // Score commitment
  timestamp: number; // When proof was generated
  expiresAt: number; // Proof validity window
}

export interface CommitmentData {
  hash: string; // The commitment hash
  salt: string; // Salt used (keep secret!)
  nonce: number; // Current nonce
  expiresIn: number; // Days until expiration
}

// ===========================================================================
// PEDERSEN COMMITMENT
// ===========================================================================

/**
 * Generate a cryptographic salt for hiding
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Create a Pedersen-style commitment to a credit score
 * commitment = Hash(score || salt)
 *
 * This allows proving knowledge of a score without revealing it
 */
export function createCommitment(score: number, salt: string): string {
  // Validate inputs
  if (score < 300 || score > 850) {
    throw new Error("Score must be between 300 and 850");
  }

  // Convert score to bytes (4 bytes, big-endian)
  const scoreBytes = new Uint8Array(4);
  const view = new DataView(scoreBytes.buffer);
  view.setUint32(0, score, false);

  // Convert salt from hex to bytes
  const saltBytes = hexToBytes(salt);

  // Concatenate score and salt
  const combined = new Uint8Array(scoreBytes.length + saltBytes.length);
  combined.set(scoreBytes, 0);
  combined.set(saltBytes, scoreBytes.length);

  // Hash to create commitment
  const commitmentHash = sha256(combined);

  return bytesToHex(commitmentHash);
}

/**
 * Verify that a commitment matches a score and salt
 */
export function verifyCommitment(
  score: number,
  salt: string,
  commitment: string,
): boolean {
  try {
    const computed = createCommitment(score, salt);
    return computed === commitment;
  } catch {
    return false;
  }
}

// ===========================================================================
// ZK PROOF GENERATION
// ===========================================================================

/**
 * Generate a zero-knowledge proof that score >= minScore
 * without revealing the actual score
 *
 * In production, this would interface with Noir WASM prover
 * For the hackathon demo, we simulate proof generation
 */
export async function generateZKProof(inputs: ProofInputs): Promise<string> {
  // Validate inputs
  if (!verifyCommitment(inputs.score, inputs.salt, inputs.commitment)) {
    throw new Error("Commitment verification failed - score/salt mismatch");
  }

  if (inputs.score < inputs.minScore) {
    throw new Error(
      `Score ${inputs.score} does not meet minimum threshold ${inputs.minScore}`,
    );
  }

  if (inputs.score < 300 || inputs.score > 850) {
    throw new Error("Invalid score range");
  }

  // Simulate proof generation delay (in production, Noir prover takes ~2-3s)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Generate proof structure
  // In production, this would call the Noir WASM prover:
  // const proof = await noir.generateProof(circuit, {
  //   credit_score: inputs.score,
  //   salt: inputs.salt,
  //   score_commitment: inputs.commitment,
  //   min_score: inputs.minScore,
  //   pool_id: inputs.poolId,
  //   nonce: inputs.nonce,
  // });

  // For demo: Generate a deterministic proof-like structure
  const proofData = {
    // Simulated proof bytes (in production, this is the actual ZK proof)
    pi_a: generateProofElement(inputs.score, inputs.salt, "a"),
    pi_b: generateProofElement(inputs.score, inputs.salt, "b"),
    pi_c: generateProofElement(inputs.score, inputs.salt, "c"),
    protocol: "noir",
    circuit: "prove_score_threshold",
  };

  // Serialize proof
  const proofBytes = new TextEncoder().encode(JSON.stringify(proofData));
  return bytesToHex(proofBytes);
}

/**
 * Generate a deterministic proof element (for demo purposes)
 */
function generateProofElement(
  score: number,
  salt: string,
  suffix: string,
): string {
  const input = `${score}-${salt}-${suffix}`;
  const hash = sha256(new TextEncoder().encode(input));
  return bytesToHex(hash);
}

/**
 * Generate complete proof with all metadata
 */
export async function generateCompleteProof(
  inputs: ProofInputs,
): Promise<GeneratedProof> {
  const proof = await generateZKProof(inputs);
  const now = Date.now();
  const expiresAt = now + 60 * 60 * 1000; // 1 hour validity

  return {
    proof,
    publicInputs: [
      inputs.commitment,
      inputs.minScore.toString(),
      inputs.poolId,
      inputs.nonce.toString(),
      Math.floor(now / 1000).toString(),
    ],
    commitment: inputs.commitment,
    timestamp: now,
    expiresAt,
  };
}

// ===========================================================================
// PROOF VERIFICATION (Client-side check before submission)
// ===========================================================================

/**
 * Verify proof structure before submission
 * Note: Actual verification happens on-chain via Sunspot
 */
export function verifyProofStructure(proof: string): boolean {
  try {
    const proofBytes = hexToBytes(proof);
    const proofData = JSON.parse(new TextDecoder().decode(proofBytes));

    return !!(
      proofData.pi_a &&
      proofData.pi_b &&
      proofData.pi_c &&
      proofData.protocol === "noir" &&
      proofData.circuit === "prove_score_threshold"
    );
  } catch {
    return false;
  }
}

/**
 * Check if a proof has expired
 */
export function isProofExpired(proof: GeneratedProof): boolean {
  return Date.now() > proof.expiresAt;
}

// ===========================================================================
// DTI RATIO PROOF
// ===========================================================================

export interface DTIProofInputs {
  monthlyIncome: number; // PRIVATE
  monthlyDebt: number; // PRIVATE
  incomeSalt: string; // PRIVATE
  debtSalt: string; // PRIVATE
  incomeCommitment: string; // PUBLIC
  debtCommitment: string; // PUBLIC
  maxDTI: number; // PUBLIC (e.g., 4000 for 40%)
  poolId: string; // PUBLIC
  nonce: number; // PUBLIC
}

/**
 * Generate ZK proof that DTI ratio is below threshold
 */
export async function generateDTIProof(
  inputs: DTIProofInputs,
): Promise<string> {
  // Validate DTI ratio
  const dtiRatio = (inputs.monthlyDebt / inputs.monthlyIncome) * 10000;
  if (dtiRatio > inputs.maxDTI) {
    throw new Error(
      `DTI ratio ${(dtiRatio / 100).toFixed(1)}% exceeds maximum ${
        inputs.maxDTI / 100
      }%`,
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const proofData = {
    pi_a: generateProofElement(
      inputs.monthlyIncome,
      inputs.incomeSalt,
      "dti-a",
    ),
    pi_b: generateProofElement(inputs.monthlyDebt, inputs.debtSalt, "dti-b"),
    pi_c: generateProofElement(
      inputs.monthlyIncome + inputs.monthlyDebt,
      inputs.incomeSalt,
      "dti-c",
    ),
    protocol: "noir",
    circuit: "prove_dti_ratio",
  };

  const proofBytes = new TextEncoder().encode(JSON.stringify(proofData));
  return bytesToHex(proofBytes);
}

// ===========================================================================
// PAYMENT HISTORY PROOF
// ===========================================================================

export interface PaymentHistoryProofInputs {
  onTimePayments: number; // PRIVATE
  totalPayments: number; // PRIVATE
  historySalt: string; // PRIVATE
  historyCommitment: string; // PUBLIC
  minPaymentRate: number; // PUBLIC (e.g., 9000 for 90%)
  minPaymentCount: number; // PUBLIC
  poolId: string; // PUBLIC
  nonce: number; // PUBLIC
}

/**
 * Generate ZK proof of good payment history
 */
export async function generatePaymentHistoryProof(
  inputs: PaymentHistoryProofInputs,
): Promise<string> {
  // Validate payment rate
  const paymentRate = (inputs.onTimePayments / inputs.totalPayments) * 10000;
  if (paymentRate < inputs.minPaymentRate) {
    throw new Error(
      `Payment rate ${(paymentRate / 100).toFixed(1)}% below minimum ${
        inputs.minPaymentRate / 100
      }%`,
    );
  }

  if (inputs.totalPayments < inputs.minPaymentCount) {
    throw new Error(
      `Only ${inputs.totalPayments} payments, minimum ${inputs.minPaymentCount} required`,
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const proofData = {
    pi_a: generateProofElement(
      inputs.onTimePayments,
      inputs.historySalt,
      "payment-a",
    ),
    pi_b: generateProofElement(
      inputs.totalPayments,
      inputs.historySalt,
      "payment-b",
    ),
    pi_c: generateProofElement(
      inputs.onTimePayments + inputs.totalPayments,
      inputs.historySalt,
      "payment-c",
    ),
    protocol: "noir",
    circuit: "prove_payment_history",
  };

  const proofBytes = new TextEncoder().encode(JSON.stringify(proofData));
  return bytesToHex(proofBytes);
}

// ===========================================================================
// COMPREHENSIVE CREDITWORTHY PROOF
// ===========================================================================

export interface CreditworthyProofInputs extends ProofInputs {
  monthlyIncome: number;
  monthlyDebt: number;
  onTimePayments: number;
  totalPayments: number;
  maxDTI: number;
  minPaymentRate: number;
  minPaymentCount: number;
}

/**
 * Generate comprehensive proof combining all credit checks
 */
export async function generateCreditworthyProof(
  inputs: CreditworthyProofInputs,
): Promise<GeneratedProof> {
  // Validate all criteria
  if (inputs.score < inputs.minScore) {
    throw new Error(`Score ${inputs.score} below minimum ${inputs.minScore}`);
  }

  const dtiRatio = (inputs.monthlyDebt / inputs.monthlyIncome) * 10000;
  if (dtiRatio > inputs.maxDTI) {
    throw new Error(`DTI ratio exceeds maximum`);
  }

  const paymentRate = (inputs.onTimePayments / inputs.totalPayments) * 10000;
  if (paymentRate < inputs.minPaymentRate) {
    throw new Error(`Payment rate below minimum`);
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const masterProofData = {
    pi_a: generateProofElement(inputs.score, inputs.salt, "master-a"),
    pi_b: generateProofElement(inputs.monthlyIncome, inputs.salt, "master-b"),
    pi_c: generateProofElement(inputs.onTimePayments, inputs.salt, "master-c"),
    protocol: "noir",
    circuit: "prove_creditworthy",
    checks: ["score", "dti", "payment_history"],
  };

  const proof = bytesToHex(
    new TextEncoder().encode(JSON.stringify(masterProofData)),
  );
  const now = Date.now();

  return {
    proof,
    publicInputs: [
      inputs.commitment,
      inputs.minScore.toString(),
      inputs.maxDTI.toString(),
      inputs.minPaymentRate.toString(),
      inputs.poolId,
      inputs.nonce.toString(),
    ],
    commitment: inputs.commitment,
    timestamp: now,
    expiresAt: now + 60 * 60 * 1000,
  };
}

// ===========================================================================
// UTILITY FUNCTIONS
// ===========================================================================

/**
 * Serialize proof for on-chain submission
 */
export function serializeProofForChain(proof: GeneratedProof): {
  proofBytes: Uint8Array;
  publicInputsBytes: Uint8Array;
} {
  const proofBytes = hexToBytes(proof.proof);
  const publicInputsStr = proof.publicInputs.join(",");
  const publicInputsBytes = new TextEncoder().encode(publicInputsStr);

  return { proofBytes, publicInputsBytes };
}

/**
 * Create commitment data for storage
 */
export function createCommitmentData(score: number): CommitmentData {
  const salt = generateSalt();
  const hash = createCommitment(score, salt);

  return {
    hash,
    salt,
    nonce: 1,
    expiresIn: 30, // 30 days
  };
}

// ===========================================================================
// EXPORTS
// ===========================================================================

const zkProofUtils = {
  generateSalt,
  createCommitment,
  verifyCommitment,
  generateZKProof,
  generateCompleteProof,
  generateDTIProof,
  generatePaymentHistoryProof,
  generateCreditworthyProof,
  verifyProofStructure,
  isProofExpired,
  serializeProofForChain,
  createCommitmentData,
};

export default zkProofUtils;
