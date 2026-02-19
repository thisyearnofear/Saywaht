import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSSRSafeStorage } from "@/lib/storage-ssr-safe";

// --- Types ---

export interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: 'daily' | 'achievement' | 'milestone';
  condition: {
    type: 'create_commentary' | 'share_farcaster' | 'streak' | 'total_views';
    target: number;
  };
  icon: string;
}

export interface UserProgress {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  streakDays: number;
  lastActivityDate: string | null;
  completedMissionIds: string[];
  totalCommentaries: number;
}

// --- Constants ---

const LEVEL_SCALING_FACTOR = 1.5;
const BASE_XP = 100;

export const AVAILABLE_MISSIONS: Mission[] = [
  {
    id: 'daily-first-post',
    title: 'Daily Voice',
    description: 'Create your first commentary of the day',
    xpReward: 50,
    type: 'daily',
    condition: { type: 'create_commentary', target: 1 },
    icon: '🎙️'
  },
  {
    id: 'streak-3',
    title: 'Consistency is Key',
    description: 'Maintain a 3-day posting streak',
    xpReward: 150,
    type: 'milestone',
    condition: { type: 'streak', target: 3 },
    icon: '🔥'
  },
  {
    id: 'share-master',
    title: 'Social Butterfly',
    description: 'Share a commentary to Farcaster',
    xpReward: 100,
    type: 'daily',
    condition: { type: 'share_farcaster', target: 1 },
    icon: '🦋'
  },
  {
    id: 'novice-commentator',
    title: 'Novice Commentator',
    description: 'Create 5 total commentaries',
    xpReward: 200,
    type: 'achievement',
    condition: { type: 'create_commentary', target: 5 },
    icon: '🥉'
  },
  {
    id: 'expert-commentator',
    title: 'Expert Commentator',
    description: 'Create 20 total commentaries',
    xpReward: 500,
    type: 'achievement',
    condition: { type: 'create_commentary', target: 20 },
    icon: '🥇'
  }
];

// --- Store ---

interface MissionStore extends UserProgress {
  // Actions
  addXp: (amount: number, address?: string) => Promise<void>;
  completeMission: (missionId: string, address?: string) => Promise<void>;
  updateStreak: (address?: string) => Promise<void>;
  incrementCommentaryCount: (address?: string) => Promise<void>;
  resetDailyMissions: () => void;
  fetchProgress: (address: string) => Promise<void>;
  syncProgress: (address: string) => Promise<void>;
}

export const useMissionStore = create<MissionStore>()(
  persist(
    (set, get) => ({
      level: 1,
      currentXp: 0,
      nextLevelXp: BASE_XP,
      streakDays: 0,
      lastActivityDate: null,
      completedMissionIds: [],
      totalCommentaries: 0,

      fetchProgress: async (address: string) => {
        try {
          const response = await fetch(`/api/user/progress/${address}`);
          const data = await response.json();
          if (data.progress) {
            const p = data.progress;
            set({
              level: Number(p.level),
              currentXp: Number(p.currentXp),
              nextLevelXp: Number(p.nextLevelXp),
              streakDays: Number(p.streakDays),
              lastActivityDate: p.lastActivityDate ? p.lastActivityDate.split('T')[0] : null,
              completedMissionIds: p.completedMissionIds ? p.completedMissionIds.split(',') : [],
              totalCommentaries: Number(p.totalCommentaries)
            });
          }
        } catch (e) {
          console.error("Failed to fetch progress", e);
        }
      },

      syncProgress: async (address: string) => {
        try {
          const { level, currentXp, nextLevelXp, streakDays, completedMissionIds, totalCommentaries, lastActivityDate } = get();
          await fetch(`/api/user/progress/${address}`, {
            method: 'POST',
            body: JSON.stringify({
              level,
              currentXp,
              nextLevelXp,
              streakDays,
              completedMissionIds,
              totalCommentaries,
              lastActivityDate
            })
          });
        } catch (e) {
          console.error("Failed to sync progress", e);
        }
      },

      addXp: async (amount: number, address?: string) => {
        const { currentXp, nextLevelXp, level } = get();
        let newXp = currentXp + amount;
        let newLevel = level;
        let newNextLevelXp = nextLevelXp;

        // Level up logic
        while (newXp >= newNextLevelXp) {
          newXp -= newNextLevelXp;
          newLevel++;
          newNextLevelXp = Math.floor(newNextLevelXp * LEVEL_SCALING_FACTOR);
        }

        set({
          currentXp: newXp,
          level: newLevel,
          nextLevelXp: newNextLevelXp
        });

        if (address) await get().syncProgress(address);
      },

      completeMission: async (missionId: string, address?: string) => {
        const { completedMissionIds, addXp } = get();
        if (completedMissionIds.includes(missionId)) return;

        const mission = AVAILABLE_MISSIONS.find(m => m.id === missionId);
        if (mission) {
          set({ completedMissionIds: [...completedMissionIds, missionId] });
          await addXp(mission.xpReward, address);
        }
      },

      updateStreak: async (address?: string) => {
        const { lastActivityDate, streakDays } = get();
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        if (lastActivityDate === today) return;

        if (lastActivityDate) {
          const lastDate = new Date(lastActivityDate);
          const diffTime = Math.abs(now.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

          if (diffDays === 1) {
            set({ streakDays: streakDays + 1, lastActivityDate: today });
          } else {
            set({ streakDays: 1, lastActivityDate: today });
          }
        } else {
          set({ streakDays: 1, lastActivityDate: today });
        }

        if (address) await get().syncProgress(address);
      },

      incrementCommentaryCount: async (address?: string) => {
        const { totalCommentaries, completeMission } = get();
        const newCount = totalCommentaries + 1;
        set({ totalCommentaries: newCount });
        await get().updateStreak(address);

        if (newCount === 5) await completeMission('novice-commentator', address);
        if (newCount === 20) await completeMission('expert-commentator', address);
        
        await completeMission('daily-first-post', address); 
      },

      resetDailyMissions: () => {
        const { lastActivityDate, completedMissionIds } = get();
        const today = new Date().toISOString().split('T')[0];

        if (lastActivityDate !== today) {
           const dailyMissionIds = AVAILABLE_MISSIONS
             .filter(m => m.type === 'daily')
             .map(m => m.id);
           
           set({
             completedMissionIds: completedMissionIds.filter(id => !dailyMissionIds.includes(id))
           });
        }
      }
    }),
    {
      name: "mission-storage",
      storage: createSSRSafeStorage(),
    }
  )
);
