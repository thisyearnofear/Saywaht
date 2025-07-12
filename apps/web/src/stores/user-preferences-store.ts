import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserPreferences {
  // Editor preferences
  theme: "dark" | "light" | "system";
  autoSave: boolean;
  snapToGrid: boolean;
  showWaveforms: boolean;
  
  // Timeline preferences
  timelineZoom: number;
  trackHeight: number;
  showTimecodes: boolean;
  
  // Export preferences
  defaultExportFormat: "mp4" | "webm";
  defaultQuality: "720p" | "1080p" | "4k";
  defaultVideoFormat: "portrait" | "landscape" | "square";
  
  // Wallet-specific data
  walletAddress?: string;
  recentProjects: string[]; // Project IDs
  favoriteAssets: string[]; // Asset IDs
}

interface UserPreferencesStore {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  setWalletAddress: (address: string) => void;
  addRecentProject: (projectId: string) => void;
  addFavoriteAsset: (assetId: string) => void;
  removeFavoriteAsset: (assetId: string) => void;
  resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: "dark",
  autoSave: true,
  snapToGrid: true,
  showWaveforms: true,
  timelineZoom: 1,
  trackHeight: 80,
  showTimecodes: true,
  defaultExportFormat: "webm", // WebM for better web compatibility
  defaultQuality: "1080p",
  defaultVideoFormat: "portrait", // Default to mobile-first format
  recentProjects: [],
  favoriteAssets: [],
};

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      
      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),
      
      setWalletAddress: (address) =>
        set((state) => ({
          preferences: { ...state.preferences, walletAddress: address },
        })),
      
      addRecentProject: (projectId) =>
        set((state) => {
          const recent = state.preferences.recentProjects.filter(id => id !== projectId);
          return {
            preferences: {
              ...state.preferences,
              recentProjects: [projectId, ...recent].slice(0, 10), // Keep last 10
            },
          };
        }),
      
      addFavoriteAsset: (assetId) =>
        set((state) => {
          if (state.preferences.favoriteAssets.includes(assetId)) return state;
          return {
            preferences: {
              ...state.preferences,
              favoriteAssets: [...state.preferences.favoriteAssets, assetId],
            },
          };
        }),
      
      removeFavoriteAsset: (assetId) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            favoriteAssets: state.preferences.favoriteAssets.filter(id => id !== assetId),
          },
        })),
      
      resetPreferences: () =>
        set({ preferences: defaultPreferences }),
    }),
    {
      name: "saywhat-user-preferences",
      // Storage key includes wallet address for user-specific preferences
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
);

// Hook to get wallet-specific storage key
export function useWalletSpecificStorage() {
  const { preferences, setWalletAddress } = useUserPreferencesStore();
  
  const updateStorageForWallet = (walletAddress: string) => {
    setWalletAddress(walletAddress);
    // Could implement wallet-specific storage partitioning here if needed
  };
  
  return {
    walletAddress: preferences.walletAddress,
    updateStorageForWallet,
  };
}
