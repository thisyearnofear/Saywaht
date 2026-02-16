"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { ArrowRight, Star, Menu, X } from "@/lib/icons";
import { HeaderBase } from "./header-base";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

import { useWalletAuth, formatWalletAddress } from "@saywaht/auth";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MobileWalletButton } from "./mobile-wallet-connect";
import { useIsMobile } from "@/hooks/use-mobile";

function WalletComponents({
  mobile,
  onClose,
}: {
  mobile?: boolean;
  onClose?: () => void;
}) {
  const { user, isAuthenticated } = useWalletAuth();
  const { isConnected, address } = useAccount();
  const isMobileDevice = useIsMobile();

  const connectedDisplay = (
    <div className={cn("flex items-center gap-3", mobile && "flex-col w-full")}>
      <div className="flex flex-col items-end px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
        <span className="text-[10px] uppercase font-bold text-primary tracking-wider leading-none">Connected</span>
        <span className="text-xs font-mono font-medium">{formatWalletAddress(address || user?.address || "")}</span>
      </div>
      <Link href="/editor" onClick={onClose} className={mobile ? "w-full" : ""}>
        <Button size={mobile ? "default" : "sm"} className={cn("font-medium", mobile && "w-full")}>
          Launch Editor
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );

  if (mobile) {
    return isConnected ? (
      connectedDisplay
    ) : (
      <div className="flex justify-center">
        {/* ENHANCEMENT: Use mobile-optimized wallet button */}
        {isMobileDevice ? <MobileWalletButton /> : <ConnectButton />}
      </div>
    );
  }

  return isConnected ? (
    connectedDisplay
  ) : (
    /* ENHANCEMENT: Use mobile-optimized wallet button on mobile devices */
    isMobileDevice ? <MobileWalletButton /> : <ConnectButton />
  );
}

export function Header() {
  const [star, setStar] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Only fetch stars on client side
    const fetchStars = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/thisyearnofear/saywaht"
        );
        const data = await response.json();
        setStar(data.stargazers_count?.toString() || "");
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
        alt="saywaht Logo"
        width={28}
        height={28}
        className="rounded-md"
      />
      <span className="font-semibold tracking-tight text-lg">saywaht</span>
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

        {/* Wallet Components - Only render on client */}
        {isClient && <WalletComponents />}
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
        <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border md:hidden z-50 shadow-xl">
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
            {/* Wallet Components - Only render on client */}
            {isClient && (
              <WalletComponents
                mobile
                onClose={() => setMobileMenuOpen(false)}
              />
            )}
          </nav>
        </div>
      )}
    </>
  );

  return <HeaderBase leftContent={leftContent} rightContent={rightContent} className="border-b border-border/40" />;
}
