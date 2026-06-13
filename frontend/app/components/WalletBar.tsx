"use client";

import { ConnectButton } from "@mysten/dapp-kit";

// Thin client boundary so the server layout never imports dapp-kit directly
// (which would evaluate React.createContext in the RSC graph and crash the build).
export function WalletBar() {
  return <ConnectButton />;
}
