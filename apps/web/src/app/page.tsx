"use client";

import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Header } from "@/components/header";
import { DiscoveryFeed } from "@/components/landing/discovery-feed";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div>
      <Header />
      <Hero />
      <Features />
      {isConnected && <DiscoveryFeed />}
    </div>
  );
}
