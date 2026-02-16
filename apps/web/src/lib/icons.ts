// Single source of truth for all icons used in the application
// Enhanced icon system with type safety and better developer experience

import type { LucideIcon } from "lucide-react";
import {
  // Navigation & UI
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  ArrowLeftToLine,
  ArrowRightToLine,
  Home,
  Menu,
  X,
  Search,
  Settings,
  Tag,
  Info,

  // Media & Editor
  Play,
  Pause,
  Square,
  Video,
  Music,
  Mic,
  Volume2,
  VolumeX,

  // Actions
  Upload,
  Download,
  Save,
  Copy,
  Edit2,
  Share2,
  Trash2,
  Scissors,
  RotateCcw,
  RefreshCw,

  // Display & Layout
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Monitor,
  Smartphone,
  GripVertical,
  MoreHorizontal,
  MoreVertical,
  SplitSquareHorizontal,

  // Content & Media
  Image,
  Sparkles,
  Plus,
  Check,
  Star,

  // Tech & Network
  Cloud,
  Zap,
  Globe,
  Wifi,
  WifiOff,
  ExternalLink,

  // Business & Finance
  Coins,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,

  // System & Status
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  AlertTriangle,

  // Organization
  Users,
  User,
  Clock,
  Layers,
  LayoutGrid,
  HardDrive,
  Type,
  Palette,
  Snowflake,
  
  // Authentication
  LogOut,

  // Social & Engagement
  Heart,
  MessageCircle,
  Eye,

  // Social & External
  Github,
} from "lucide-react";

// Re-export all icons for direct import
export {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft, ArrowLeftRight,
  ArrowLeftToLine, ArrowRightToLine, Home, Menu, X, Search, Play, Pause, Square,
  Video, Music, Mic, Volume2, VolumeX, Upload, Download, Save, Copy, Edit2,
  Share2, Trash2, Scissors, RotateCcw, RefreshCw, Maximize2, Minimize2,
  ZoomIn, ZoomOut, Monitor, Smartphone, GripVertical, MoreHorizontal,
  MoreVertical, SplitSquareHorizontal, Image, Sparkles, Plus, Check, Star,
  Cloud, Zap, Globe, Wifi, WifiOff, ExternalLink, Coins, Wallet, TrendingUp,
  TrendingDown, DollarSign, BarChart3, Loader2, AlertCircle, CheckCircle, Shield, AlertTriangle, Users, User, Clock,
  Layers, LayoutGrid, HardDrive, Type, Palette, Snowflake, Heart, MessageCircle, Eye, Github, LogOut,
  Settings, Tag, Info,
};

// Enhanced icon registry for better DX and type safety
export const ICONS = {
  // Navigation & UI
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowLeftRight: ArrowLeftRight,
  arrowLeftToLine: ArrowLeftToLine,
  arrowRightToLine: ArrowRightToLine,
  home: Home,
  menu: Menu,
  close: X,
  search: Search,
  settings: Settings,
  tag: Tag,
  info: Info,

  // Media & Editor
  play: Play,
  pause: Pause,
  stop: Square,
  video: Video,
  music: Music,
  microphone: Mic,
  volumeOn: Volume2,
  volumeOff: VolumeX,

  // Actions
  upload: Upload,
  download: Download,
  save: Save,
  copy: Copy,
  edit: Edit2,
  share: Share2,
  delete: Trash2,
  cut: Scissors,
  undo: RotateCcw,
  refresh: RefreshCw,

  // Display & Layout
  maximize: Maximize2,
  minimize: Minimize2,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  desktop: Monitor,
  mobile: Smartphone,
  drag: GripVertical,
  moreHorizontal: MoreHorizontal,
  moreVertical: MoreVertical,
  split: SplitSquareHorizontal,

  // Content & Media
  image: Image,
  sparkles: Sparkles,
  add: Plus,
  check: Check,
  star: Star,

  // Tech & Network
  cloud: Cloud,
  lightning: Zap,
  globe: Globe,
  wifi: Wifi,
  wifiOff: WifiOff,
  external: ExternalLink,

  // Business & Finance
  coins: Coins,
  wallet: Wallet,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  dollarSign: DollarSign,
  barChart: BarChart3,

  // System & Status
  loading: Loader2,
  warning: AlertCircle,
  success: CheckCircle,
  security: Shield,
  alertTriangle: AlertTriangle,

  // Organization
  users: Users,
  time: Clock,
  layers: Layers,
  storage: HardDrive,
  text: Type,
  palette: Palette,
  freeze: Snowflake,

  // Social & Engagement
  heart: Heart,
  messageCircle: MessageCircle,
  eye: Eye,

  // Social & External
  github: Github,
} as const satisfies Record<string, LucideIcon>;

// Type for icon names (enables autocomplete)
export type IconName = keyof typeof ICONS;

// Helper function to get icon by name with type safety
export function getIcon(name: IconName): LucideIcon {
  return ICONS[name];
}
