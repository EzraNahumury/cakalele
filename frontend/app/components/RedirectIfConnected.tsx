"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";

// On the landing page: once a wallet is connected (incl. autoConnect), go straight to /play.
export function RedirectIfConnected() {
  const account = useCurrentAccount();
  const router = useRouter();
  useEffect(() => {
    if (account?.address) router.replace("/play");
  }, [account?.address, router]);
  return null;
}
