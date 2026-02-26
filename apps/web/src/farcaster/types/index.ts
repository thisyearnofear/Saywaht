/**
 * Farcaster mini app specific types
 * Single source of truth for all Farcaster-related types
 */

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  profile: {
    bio: {
      text: string;
      mentions: any[];
    };
  };
}

export interface FarcasterCast {
  hash: string;
  author: FarcasterUser;
  text: string;
  timestamp: number;
  embeds: {
    url?: string;
    castId?: {
      fid: number;
      hash: string;
    };
  }[];
  reactions: {
    likes: number;
    recasts: number;
  };
  replies: {
    count: number;
  };
}

export interface FarcasterFrameAction {
  untrustedData: {
    fid: number;
    url: string;
    messageHash: string;
    timestamp: number;
    network: number;
    buttonIndex: number;
    inputText?: string;
    castId: {
      fid: number;
      hash: string;
    };
  };
  trustedData: {
    messageBytes: string;
  };
}

export interface FarcasterFrameState {
  videoUrl?: string;
  castHash?: string;
  user?: FarcasterUser;
  step: "welcome" | "recording" | "minting" | "complete" | "templates" | "trade";
  recordingTime?: number;
  source?: "miniapp" | "cast" | "direct";
  projectId?: string;
  templateId?: string;
}
