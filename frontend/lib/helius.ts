/**
 * HELIUS INTEGRATION MODULE
 *
 * Comprehensive integration with Helius RPC and APIs for:
 * - Enhanced Transaction Parsing (DeFi activity analysis)
 * - Priority Fee Estimation (reliable TX landing)
 * - Webhooks (real-time credit score updates)
 * - DAS API (token balances and metadata)
 *
 * This integration is critical for the Helius $5,000 bounty.
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { HELIUS_API_KEY, NETWORK } from "./constants";

// ===========================================================================
// TYPES
// ===========================================================================

export interface HeliusConfig {
  apiKey: string;
  network: "devnet" | "mainnet-beta";
}

export interface EnhancedTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  description: string;
  fee: number;
  feePayer: string;
  slot: number;
  nativeTransfers: NativeTransfer[];
  tokenTransfers: TokenTransfer[];
  accountData: AccountData[];
  events: TransactionEvent;
}

export interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

export interface AccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: TokenBalanceChange[];
}

export interface TokenBalanceChange {
  mint: string;
  rawTokenAmount: {
    tokenAmount: string;
    decimals: number;
  };
  tokenAccount: string;
  userAccount: string;
}

export interface TransactionEvent {
  nft?: Record<string, unknown>;
  swap?: SwapEvent;
  compressed?: Record<string, unknown>;
}

export interface SwapEvent {
  nativeInput?: { account: string; amount: string };
  nativeOutput?: { account: string; amount: string };
  tokenInputs: TokenInput[];
  tokenOutputs: TokenInput[];
  tokenFees: Record<string, unknown>[];
  innerSwaps: Record<string, unknown>[];
}

export interface TokenInput {
  userAccount: string;
  tokenAccount: string;
  mint: string;
  rawTokenAmount: {
    tokenAmount: string;
    decimals: number;
  };
}

export interface DeFiActivity {
  signature: string;
  timestamp: number;
  protocol: string;
  action:
    | "borrow"
    | "repay"
    | "deposit"
    | "withdraw"
    | "stake"
    | "unstake"
    | "swap"
    | "liquidate";
  amount: number;
  token: string;
  successful: boolean;
  onTime?: boolean; // For repayments
}

export interface CreditMetrics {
  totalBorrowed: number;
  totalRepaid: number;
  onTimePayments: number;
  latePayments: number;
  defaults: number;
  oldestActivityDays: number;
  uniqueProtocols: Set<string>;
  averageTransactionValue: number;
  totalTransactions: number;
  utilizationHistory: number[];
}

export interface PriorityFeeEstimate {
  min: number;
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
  unsafeMax: number;
}

export interface WebhookConfig {
  webhookURL: string;
  accountAddresses: string[];
  transactionTypes?: string[];
  webhookType?: "enhanced" | "raw" | "discord";
}

// ===========================================================================
// HELIUS CLIENT CLASS
// ===========================================================================

export class HeliusClient {
  private apiKey: string;
  private baseUrl: string;
  private rpcUrl: string;
  public connection: Connection;

  constructor(config?: Partial<HeliusConfig>) {
    this.apiKey = config?.apiKey || HELIUS_API_KEY || "";
    const network = config?.network || NETWORK;

    this.baseUrl =
      network === "mainnet-beta"
        ? "https://api.helius.xyz"
        : "https://api-devnet.helius.xyz";

    this.rpcUrl = this.apiKey
      ? `https://${network}.helius-rpc.com/?api-key=${this.apiKey}`
      : `https://api.${network}.solana.com`;

    this.connection = new Connection(this.rpcUrl, "confirmed");
  }

  // =========================================================================
  // ENHANCED TRANSACTIONS API
  // =========================================================================

  /**
   * Fetch parsed transaction history for a wallet
   * This is KEY for credit scoring - we analyze DeFi behavior
   */
  async getEnhancedTransactions(
    address: string,
    options: {
      limit?: number;
      before?: string;
      until?: string;
      type?: string;
    } = {},
  ): Promise<EnhancedTransaction[]> {
    if (!this.apiKey) {
      console.warn("Helius API key not configured");
      return [];
    }

    const url = new URL(`${this.baseUrl}/v0/addresses/${address}/transactions`);
    url.searchParams.set("api-key", this.apiKey);

    if (options.limit) url.searchParams.set("limit", options.limit.toString());
    if (options.before) url.searchParams.set("before", options.before);
    if (options.until) url.searchParams.set("until", options.until);
    if (options.type) url.searchParams.set("type", options.type);

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch enhanced transactions:", error);
      return [];
    }
  }

  /**
   * Parse a single transaction signature
   */
  async parseTransaction(
    signature: string,
  ): Promise<EnhancedTransaction | null> {
    if (!this.apiKey) {
      console.warn("Helius API key not configured");
      return null;
    }

    const url = `${this.baseUrl}/v0/transactions/?api-key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: [signature] }),
      });

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.statusText}`);
      }

      const results = await response.json();
      return results[0] || null;
    } catch (error) {
      console.error("Failed to parse transaction:", error);
      return null;
    }
  }

  // =========================================================================
  // DEFI ACTIVITY EXTRACTION
  // =========================================================================

  /**
   * Extract DeFi lending/borrowing activity from transaction history
   * This feeds into our credit scoring algorithm
   */
  async extractDeFiActivity(address: string): Promise<DeFiActivity[]> {
    const transactions = await this.getEnhancedTransactions(address, {
      limit: 500,
    });
    const activities: DeFiActivity[] = [];

    for (const tx of transactions) {
      const activity = this.parseActivityFromTransaction(tx);
      if (activity) {
        activities.push(activity);
      }
    }

    return activities;
  }

  /**
   * Parse a single transaction into DeFi activity
   */
  private parseActivityFromTransaction(
    tx: EnhancedTransaction,
  ): DeFiActivity | null {
    const type = tx.type?.toLowerCase() || "";
    const description = tx.description?.toLowerCase() || "";
    const source = tx.source || "Unknown";

    // Detect borrow transactions
    if (
      type === "loan" ||
      description.includes("borrow") ||
      description.includes("loan")
    ) {
      return {
        signature: tx.signature,
        timestamp: tx.timestamp,
        protocol: source,
        action: "borrow",
        amount: this.extractAmount(tx),
        token: this.extractToken(tx),
        successful: true,
      };
    }

    // Detect repay transactions
    if (description.includes("repay") || description.includes("payback")) {
      return {
        signature: tx.signature,
        timestamp: tx.timestamp,
        protocol: source,
        action: "repay",
        amount: this.extractAmount(tx),
        token: this.extractToken(tx),
        successful: true,
        onTime: true, // Would need additional logic to determine
      };
    }

    // Detect deposits
    if (
      type === "deposit" ||
      description.includes("deposit") ||
      description.includes("supply")
    ) {
      return {
        signature: tx.signature,
        timestamp: tx.timestamp,
        protocol: source,
        action: "deposit",
        amount: this.extractAmount(tx),
        token: this.extractToken(tx),
        successful: true,
      };
    }

    // Detect withdrawals
    if (type === "withdraw" || description.includes("withdraw")) {
      return {
        signature: tx.signature,
        timestamp: tx.timestamp,
        protocol: source,
        action: "withdraw",
        amount: this.extractAmount(tx),
        token: this.extractToken(tx),
        successful: true,
      };
    }

    // Detect staking
    if (description.includes("stake") && !description.includes("unstake")) {
      return {
        signature: tx.signature,
        timestamp: tx.timestamp,
        protocol: source,
        action: "stake",
        amount: this.extractAmount(tx),
        token: this.extractToken(tx),
        successful: true,
      };
    }

    // Detect swaps (relevant for utilization)
    if (type === "swap" || tx.events?.swap) {
      return {
        signature: tx.signature,
        timestamp: tx.timestamp,
        protocol: source,
        action: "swap",
        amount: this.extractAmount(tx),
        token: this.extractToken(tx),
        successful: true,
      };
    }

    return null;
  }

  /**
   * Extract amount from transaction
   */
  private extractAmount(tx: EnhancedTransaction): number {
    // Try to get from native transfers
    if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
      return tx.nativeTransfers[0].amount / 1e9; // Convert lamports to SOL
    }

    // Try to get from token transfers
    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
      return tx.tokenTransfers[0].tokenAmount;
    }

    // Try to get from swap events
    if (tx.events?.swap) {
      const swap = tx.events.swap;
      if (swap.nativeInput) {
        return parseFloat(swap.nativeInput.amount) / 1e9;
      }
      if (swap.tokenInputs && swap.tokenInputs.length > 0) {
        const input = swap.tokenInputs[0];
        return (
          parseFloat(input.rawTokenAmount.tokenAmount) /
          Math.pow(10, input.rawTokenAmount.decimals)
        );
      }
    }

    return 0;
  }

  /**
   * Extract token from transaction
   */
  private extractToken(tx: EnhancedTransaction): string {
    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
      return tx.tokenTransfers[0].mint;
    }
    return "SOL";
  }

  // =========================================================================
  // CREDIT METRICS CALCULATION
  // =========================================================================

  /**
   * Calculate credit metrics from DeFi activity
   * This is the data that feeds into our scoring algorithm
   */
  async calculateCreditMetrics(address: string): Promise<CreditMetrics> {
    const activities = await this.extractDeFiActivity(address);

    const metrics: CreditMetrics = {
      totalBorrowed: 0,
      totalRepaid: 0,
      onTimePayments: 0,
      latePayments: 0,
      defaults: 0,
      oldestActivityDays: 0,
      uniqueProtocols: new Set(),
      averageTransactionValue: 0,
      totalTransactions: activities.length,
      utilizationHistory: [],
    };

    if (activities.length === 0) {
      return metrics;
    }

    // Calculate oldest activity
    const oldestTimestamp = Math.min(...activities.map((a) => a.timestamp));
    const now = Date.now() / 1000;
    metrics.oldestActivityDays = Math.floor(
      (now - oldestTimestamp) / (60 * 60 * 24),
    );

    // Process activities
    let totalValue = 0;
    for (const activity of activities) {
      metrics.uniqueProtocols.add(activity.protocol);
      totalValue += activity.amount;

      switch (activity.action) {
        case "borrow":
          metrics.totalBorrowed += activity.amount;
          break;
        case "repay":
          metrics.totalRepaid += activity.amount;
          if (activity.onTime) {
            metrics.onTimePayments++;
          } else {
            metrics.latePayments++;
          }
          break;
      }
    }

    metrics.averageTransactionValue = totalValue / activities.length;

    // Calculate utilization history (simplified)
    const borrowed = metrics.totalBorrowed;
    const repaid = metrics.totalRepaid;
    if (borrowed > 0) {
      metrics.utilizationHistory.push((borrowed - repaid) / borrowed);
    }

    return metrics;
  }

  // =========================================================================
  // PRIORITY FEES API
  // =========================================================================

  /**
   * Get priority fee estimates for reliable transaction landing
   * Critical for time-sensitive ZK proof submissions!
   */
  async getPriorityFeeEstimate(
    accountKeys?: string[],
    options?: { includeAllPriorityFeeLevels?: boolean },
  ): Promise<PriorityFeeEstimate> {
    const params: {
      options: { includeAllPriorityFeeLevels: boolean };
      accountKeys?: string[];
    } = {
      options: {
        includeAllPriorityFeeLevels:
          options?.includeAllPriorityFeeLevels ?? true,
      },
    };

    if (accountKeys && accountKeys.length > 0) {
      params.accountKeys = accountKeys;
    }

    try {
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "priority-fee",
          method: "getPriorityFeeEstimate",
          params: [params],
        }),
      });

      const { result } = await response.json();
      return (
        result?.priorityFeeLevels || {
          min: 0,
          low: 1000,
          medium: 5000,
          high: 10000,
          veryHigh: 50000,
          unsafeMax: 100000,
        }
      );
    } catch (error) {
      console.error("Failed to get priority fee estimate:", error);
      return {
        min: 0,
        low: 1000,
        medium: 5000,
        high: 10000,
        veryHigh: 50000,
        unsafeMax: 100000,
      };
    }
  }

  /**
   * Add priority fee to transaction
   */
  async addPriorityFee(
    transaction: Transaction,
    level: "low" | "medium" | "high" | "veryHigh" = "medium",
  ): Promise<Transaction> {
    const fees = await this.getPriorityFeeEstimate();
    const priorityFee = fees[level];

    // Add compute budget instruction
    // Note: In production, import from @solana/web3.js
    const computeBudgetIx = {
      programId: new PublicKey("ComputeBudget111111111111111111111111111111"),
      keys: [],
      data: Buffer.from([
        2, // SetComputeUnitPrice
        ...new Uint8Array(new BigUint64Array([BigInt(priorityFee)]).buffer),
      ]),
    };

    transaction.instructions.unshift(
      computeBudgetIx as unknown as import("@solana/web3.js").TransactionInstruction,
    );
    return transaction;
  }

  // =========================================================================
  // WEBHOOKS API
  // =========================================================================

  /**
   * Create a webhook to monitor wallet activity
   * Enables real-time credit score updates
   */
  async createWebhook(config: WebhookConfig): Promise<{ webhookID: string }> {
    if (!this.apiKey) {
      throw new Error("Helius API key required for webhooks");
    }

    const response = await fetch(
      `${this.baseUrl}/v0/webhooks?api-key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookURL: config.webhookURL,
          transactionTypes: config.transactionTypes || ["Any"],
          accountAddresses: config.accountAddresses,
          webhookType: config.webhookType || "enhanced",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create webhook: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all webhooks
   */
  async getWebhooks(): Promise<Record<string, unknown>[]> {
    if (!this.apiKey) {
      throw new Error("Helius API key required for webhooks");
    }

    const response = await fetch(
      `${this.baseUrl}/v0/webhooks?api-key=${this.apiKey}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get webhooks: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Helius API key required for webhooks");
    }

    const response = await fetch(
      `${this.baseUrl}/v0/webhooks/${webhookId}?api-key=${this.apiKey}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete webhook: ${response.statusText}`);
    }
  }

  // =========================================================================
  // DAS API (Digital Asset Standard)
  // =========================================================================

  /**
   * Get assets by owner using DAS API
   */
  async getAssetsByOwner(
    owner: string,
    options?: {
      page?: number;
      limit?: number;
      displayOptions?: {
        showFungible?: boolean;
        showNativeBalance?: boolean;
      };
    },
  ): Promise<{ items?: Record<string, unknown>[] }> {
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-assets",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: owner,
          page: options?.page || 1,
          limit: options?.limit || 100,
          displayOptions: options?.displayOptions || {
            showFungible: true,
            showNativeBalance: true,
          },
        },
      }),
    });

    const { result } = await response.json();
    return result;
  }

  /**
   * Get token balances for an address
   */
  async getTokenBalances(address: string): Promise<Record<string, unknown>[]> {
    const assets = await this.getAssetsByOwner(address, {
      displayOptions: { showFungible: true },
    });

    return (
      assets?.items?.filter(
        (item: Record<string, unknown>) =>
          item.interface === "FungibleToken" ||
          item.interface === "FungibleAsset",
      ) || []
    );
  }
}

// ===========================================================================
// SINGLETON INSTANCE
// ===========================================================================

let heliusClientInstance: HeliusClient | null = null;

export function getHeliusClient(): HeliusClient {
  if (!heliusClientInstance) {
    heliusClientInstance = new HeliusClient();
  }
  return heliusClientInstance;
}

// ===========================================================================
// EXPORTS
// ===========================================================================

export default HeliusClient;
