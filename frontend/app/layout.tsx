"use client";

import { FC, ReactNode, useMemo } from "react";
import { Inter } from "next/font/google";
import Link from "next/link";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { Toaster } from "react-hot-toast";
import { HELIUS_RPC_URL, COMMITMENT } from "../lib/constants";

import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Wallet Context Provider Component
const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    [],
  );

  // Handle wallet errors
  const onError = (error: Error) => {
    console.error("Wallet error:", error);
  };

  return (
    <ConnectionProvider
      endpoint={HELIUS_RPC_URL}
      config={{ commitment: COMMITMENT }}
    >
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Root Layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>PrivateScore - Privacy-Preserving Credit Scoring</title>
        <meta
          name="description"
          content="Get reduced collateral DeFi loans with zero-knowledge credit proofs. Prove your creditworthiness without revealing your actual score."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="PrivateScore - Privacy-Preserving Credit Scoring"
        />
        <meta
          property="og:description"
          content="Get reduced collateral DeFi loans with zero-knowledge credit proofs."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="PrivateScore - Privacy-Preserving Credit Scoring"
        />
        <meta
          name="twitter:description"
          content="Get reduced collateral DeFi loans with zero-knowledge credit proofs."
        />
      </head>
      <body className={`${inter.className} bg-gray-900 text-white antialiased`}>
        <WalletContextProvider>
          {/* Navigation Header */}
          <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">PS</span>
                  </div>
                  <span className="text-xl font-bold gradient-text">
                    PrivateScore
                  </span>
                </Link>

                <nav className="hidden md:flex items-center space-x-6">
                  <Link
                    href="/"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Home
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/borrow"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Borrow
                  </Link>
                </nav>

                <WalletMultiButton />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="min-h-screen">{children}</main>

          {/* Footer */}
          <footer className="border-t border-gray-800 bg-gray-900 py-8">
            <div className="container mx-auto px-4">
              <div className="text-center text-gray-400">
                <p>
                  &copy; 2024 PrivateScore. Privacy-preserving credit scoring on
                  Solana.
                </p>
              </div>
            </div>
          </footer>

          {/* Toast Notifications */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: "#1f2937",
                color: "#fff",
                border: "1px solid #374151",
                borderRadius: "12px",
              },
              success: {
                iconTheme: {
                  primary: "#22c55e",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  );
}
