"use client";

import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Header } from "@/components/header";
import { DiscoveryFeed } from "@/components/landing/discovery-feed";
export default function Home() {
  return (
    <div>
      <Header />
      <Hero />
      <Features />
      <DiscoveryFeed />
    </div>
  );
}
