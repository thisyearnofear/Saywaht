// Enhanced library exports - Single source of truth for all lib modules
// Organized by domain for better developer experience

// ============================================================================
// CORE UTILITIES
// ============================================================================
export * from "./utils";
export * from "./types";

// ============================================================================
// ICON SYSTEM
// ============================================================================
export * from "./icons";

// ============================================================================
// PERFORMANCE & OPTIMIZATION
// ============================================================================
export * from "./performance";
export * from "./bundle-analysis";
export * from "./adaptive-loading";

// ============================================================================
// CONSTANTS
// ============================================================================

// App configuration
export const APP_CONFIG = {
  name: "saywaht",
  description: "AI-powered video editor",
  version: "0.1.0",
  author: "saywaht Team",
} as const;

// Platform configuration (consolidated from constants.ts)
export const PLATFORM_ADDRESS = "0x55A5705453Ee82c742274154136Fce8149597058" as const;
export const PLATFORM_NAME = "saywaht";
export const PLATFORM_URLS = {
  production: "https://saywaht.com",
  development: "http://localhost:3000",
} as const;
export const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || PLATFORM_URLS.production;

// API endpoints
export const API_ENDPOINTS = {
  auth: "/api/auth",
  projects: "/api/projects",
  templates: "/api/templates",
  upload: "/api/upload",
  export: "/api/export",
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  theme: "saywaht-theme",
  user: "saywaht-user",
  projects: "saywaht-projects",
  settings: "saywaht-settings",
} as const;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
} as const;

// File validation
export const FILE_VALIDATION = {
  maxSize: {
    image: 5 * 1024 * 1024, // 5MB
    video: 100 * 1024 * 1024, // 100MB
    audio: 10 * 1024 * 1024, // 10MB
  },
  allowedTypes: {
    image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    video: ["video/mp4", "video/webm", "video/quicktime"],
    audio: ["audio/mp3", "audio/wav", "audio/ogg"],
  },
} as const;

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT: "RATE_LIMIT",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  enableAI: true,
  enableCollaboration: false,
  enableAdvancedExport: true,
  enableAnalytics: true,
  enableBetaFeatures: false,
} as const;

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

export const ANIMATIONS = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
  },
} as const;
