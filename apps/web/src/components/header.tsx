"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { 
  ArrowRight, 
  Star, 
  Menu, 
  X,
  Home,
  Video,
  TrendingUp,
  LayoutGrid,
  User,
  LogOut,
  ExternalLink,
  Github,
  Wallet
} from "@/lib/icons";
import { HeaderBase } from "./header-base";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

import { useWalletAuth, formatWalletAddress } from "@saywaht/auth";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MobileWalletButton } from "./mobile-wallet-connect";
import { useIsMobile } from "@/hooks/use-mobile";
import { addHapticFeedback } from "@/lib/mobile-utils";

// Navigation items configuration
const navigationItems = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    path: "/",
    description: "Landing page",
    requiresAuth: false,
  },
  {
    id: "editor",
    label: "Editor",
    icon: Video,
    path: "/editor",
    description: "Create videos",
    requiresAuth: true,
    isPrimary: true,
  },
  {
    id: "templates",
    label: "Templates",
    icon: LayoutGrid,
    path: "/templates",
    description: "Start from template",
    requiresAuth: false,
  },
  {
    id: "trade",
    label: "Trade",
    icon: TrendingUp,
    path: "/trade",
    description: "Trade coins",
    requiresAuth: true,
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    path: "/profile",
    description: "Your profile",
    requiresAuth: true,
  },
];

const externalLinks = [
  {
    id: "github",
    label: "GitHub",
    icon: Github,
    href: "http://github.com/thisyearnofear/saywaht",
    showStars: true,
  },
  {
    id: "lens",
    label: "Lens",
    href: "https://hey.xyz/u/papajams",
  },
  {
    id: "farcaster",
    label: "Farcaster",
    href: "https://farcaster.xyz/papa",
  },
];

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
        {isMobileDevice ? <MobileWalletButton /> : <ConnectButton />}
      </div>
    );
  }

  return isConnected ? (
    connectedDisplay
  ) : (
    isMobileDevice ? <MobileWalletButton /> : <ConnectButton />
  );
}

// Mobile menu navigation item
function MobileNavItem({
  item,
  isActive,
  onClick,
}: {
  item: typeof navigationItems[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  
  return (
    <Link href={item.path} onClick={onClick}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start h-14 px-4",
          isActive && "bg-primary/10 text-primary border border-primary/20"
        )}
      >
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center mr-3",
          isActive ? "bg-primary/20" : "bg-muted"
        )}>
          <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 text-left">
          <div className={cn("font-medium", isActive && "text-primary")}>{item.label}</div>
          <div className="text-xs text-muted-foreground">{item.description}</div>
        </div>
        {isActive && <div className="w-2 h-2 rounded-full bg-primary" />}
      </Button>
    </Link>
  );
}

export function Header() {
  const [star, setStar] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { isAuthenticated } = useWalletAuth();

  useEffect(() => {
    setIsClient(true);

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

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleCloseMenu = () => {
    addHapticFeedback("light");
    setMobileMenuOpen(false);
  };

  const handleDisconnect = () => {
    addHapticFeedback("medium");
    disconnect();
    handleCloseMenu();
  };

  // Filter navigation items based on auth status
  const visibleNavItems = navigationItems.filter(item => 
    !item.requiresAuth || (item.requiresAuth && isConnected)
  );

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
        {visibleNavItems.map((item) => (
          <Link key={item.id} href={item.path}>
            <Button 
              variant={pathname === item.path ? "secondary" : "text"} 
              className="text-sm font-medium"
            >
              {item.label}
            </Button>
          </Link>
        ))}

        <div className="w-px h-6 bg-border mx-2" />

        {/* External Links - Desktop */}
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
        className="md:hidden h-11 w-11 min-h-[44px] min-w-[44px]"
        onClick={() => {
          addHapticFeedback("light");
          setMobileMenuOpen(!mobileMenuOpen);
        }}
      >
        {mobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
            onClick={handleCloseMenu}
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-x-0 top-0 bg-background z-50 md:hidden shadow-2xl max-h-[90vh] overflow-y-auto rounded-b-2xl">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="saywaht Logo"
                  width={32}
                  height={32}
                  className="rounded-md"
                />
                <span className="font-semibold text-lg">Menu</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={handleCloseMenu}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex flex-col p-4 gap-2">
              {/* Wallet Status Section */}
              {isConnected ? (
                <div className="p-4 bg-muted/50 rounded-xl mb-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Connected</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                      </div>
                    </div>
                  </div>
                  <Link href="/editor" onClick={handleCloseMenu}>
                    <Button className="w-full">
                      <Video className="h-4 w-4 mr-2" />
                      Launch Editor
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-xl mb-2">
                  <div className="text-center mb-3">
                    <div className="text-sm text-muted-foreground mb-2">
                      Connect wallet to create and trade
                    </div>
                  </div>
                  <div className="flex justify-center">
                    {isClient && <MobileWalletButton />}
                  </div>
                </div>
              )}

              {/* Main Navigation */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">
                  Navigation
                </div>
                {visibleNavItems.map((item) => (
                  <MobileNavItem
                    key={item.id}
                    item={item}
                    isActive={pathname === item.path}
                    onClick={handleCloseMenu}
                  />
                ))}
              </div>

              <div className="border-t border-border my-2" />

              {/* External Links */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">
                  Links
                </div>
                {externalLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    target="_blank"
                    onClick={handleCloseMenu}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 px-4"
                    >
                      {link.icon && (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mr-3">
                          <link.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 text-left">{link.label}</span>
                      {link.showStars && star && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-full mr-2">
                          {star}
                        </span>
                      )}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </Link>
                ))}
              </div>

              {/* Disconnect Button (if connected) */}
              {isConnected && (
                <>
                  <div className="border-t border-border my-2" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 px-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDisconnect}
                  >
                    <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center mr-3">
                      <LogOut className="h-5 w-5" />
                    </div>
                    <span>Disconnect Wallet</span>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );

  return <HeaderBase leftContent={leftContent} rightContent={rightContent} className="border-b border-border/40" />;
}
