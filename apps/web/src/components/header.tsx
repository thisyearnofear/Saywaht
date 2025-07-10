"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { ArrowRight, Star, Menu, X } from "@/lib/icons-provider";
import { HeaderBase } from "./header-base";
import { useWalletAuth } from "@opencut/auth";
import { getStars } from "@/lib/fetchGhStars";
import { useEffect, useState } from "@/lib/hooks-provider";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  const { isAuthenticated } = useWalletAuth();
  const { isConnected } = useAccount();
  const [star, setStar] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const data = await getStars();
        setStar(data);
      } catch (err) {
        console.error("Failed to fetch GitHub stars", err);
      }
    };

    fetchStars();
  }, []);

  const leftContent = (
    <Link
      href="/"
      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
    >
      <Image
        src="/logo.png"
        alt="SayWhat Logo"
        width={28}
        height={28}
        className="rounded-md"
      />
      <span className="font-semibold tracking-tight text-lg">SayWhat</span>
    </Link>
  );

  const rightContent = (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-1">
        <Link href="https://hey.xyz/u/papajams" target="_blank">
          <Button variant="text" className="text-sm font-medium">
            Lens
          </Button>
        </Link>
        <Link href="https://farcaster.xyz/papa" target="_blank">
          <Button variant="text" className="text-sm font-medium">
            Farcaster
          </Button>
        </Link>

        {/* GitHub Star Button */}
        <Link href="http://github.com/thisyearnofear/saywaht" target="_blank">
          <Button
            variant="text"
            size="sm"
            className="text-sm font-medium gap-2"
          >
            <Star className="h-4 w-4" />
            {star && (
              <span className="text-xs bg-muted px-2 py-1 rounded-full">
                {star}
              </span>
            )}
          </Button>
        </Link>

        <div className="w-px h-6 bg-border mx-2" />

        {isConnected ? (
          <Link href="/editor">
            <Button size="sm" className="text-sm font-medium">
              Launch Editor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <ConnectButton />
        )}
      </nav>

      {/* Mobile Menu Button */}
      <Button
        variant="text"
        size="sm"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b border-border md:hidden">
          <nav className="flex flex-col p-4 gap-2">
            <Link
              href="https://hey.xyz/u/papajams"
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button
                variant="text"
                className="w-full justify-start text-sm font-medium"
              >
                Lens
              </Button>
            </Link>
            <Link
              href="https://farcaster.xyz/papa"
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button
                variant="text"
                className="w-full justify-start text-sm font-medium"
              >
                Farcaster
              </Button>
            </Link>
            <Link
              href="http://github.com/thisyearnofear/saywaht"
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button
                variant="text"
                className="w-full justify-start text-sm font-medium gap-2"
              >
                <Star className="h-4 w-4" />
                GitHub {star && `(${star})`}
              </Button>
            </Link>
            <div className="border-t border-border my-2" />
            {isConnected ? (
              <Link href="/editor" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full text-sm font-medium">
                  Launch Editor
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );

  return <HeaderBase leftContent={leftContent} rightContent={rightContent} />;
}
