// Game state management with Zustand

import { create } from 'zustand';
import { gameApi } from '../api/client';
import type { PlayerProgress, Achievement, Challenge, Equipment, StoreInventory } from '../api/client';

interface GameState {
  // Player progress
  progress: PlayerProgress | null;
  isLoadingProgress: boolean;

  // Achievements
  achievements: Achievement[];
  unlockedAchievements: Achievement[];

  // Challenges
  challenges: Challenge[];
  availableChallenges: Challenge[];
  activeChallenge: Challenge | null;

  // Store
  store: StoreInventory | null;
  ownedEquipment: Equipment[];

  // UI state
  showAchievementPopup: Achievement | null;
  showLevelUpPopup: boolean;
  newLevel: number;

  // Actions
  fetchProgress: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  fetchChallenges: () => Promise<void>;
  fetchStore: () => Promise<void>;
  purchaseEquipment: (id: string) => Promise<boolean>;
  startChallenge: (id: string) => Promise<void>;
  dismissAchievementPopup: () => void;
  dismissLevelUpPopup: () => void;
  handleAchievementUnlocked: (achievement: Achievement) => void;
  handleLevelUp: (newLevel: number) => void;
  handleCurrencyEarned: (amount: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  progress: null,
  isLoadingProgress: false,
  achievements: [],
  unlockedAchievements: [],
  challenges: [],
  availableChallenges: [],
  activeChallenge: null,
  store: null,
  ownedEquipment: [],
  showAchievementPopup: null,
  showLevelUpPopup: false,
  newLevel: 0,

  // Actions
  fetchProgress: async () => {
    set({ isLoadingProgress: true });
    try {
      const progress = await gameApi.getProgress();
      set({ progress, isLoadingProgress: false });
    } catch (error) {
      console.error('Failed to fetch progress:', error);
      set({ isLoadingProgress: false });
    }
  },

  fetchAchievements: async () => {
    try {
      const [achievements, unlockedAchievements] = await Promise.all([
        gameApi.getAchievements(),
        gameApi.getUnlockedAchievements(),
      ]);
      set({ achievements, unlockedAchievements });
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  },

  fetchChallenges: async () => {
    try {
      const [challenges, availableChallenges] = await Promise.all([
        gameApi.getChallenges(),
        gameApi.getAvailableChallenges(),
      ]);
      set({ challenges, availableChallenges });
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    }
  },

  fetchStore: async () => {
    try {
      const [store, ownedEquipment] = await Promise.all([
        gameApi.getStore(),
        gameApi.getOwnedEquipment(),
      ]);
      set({ store, ownedEquipment });
    } catch (error) {
      console.error('Failed to fetch store:', error);
    }
  },

  purchaseEquipment: async (id: string) => {
    try {
      const result = await gameApi.purchaseEquipment(id);
      if (result.success) {
        // Refresh store and progress
        await Promise.all([get().fetchStore(), get().fetchProgress()]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to purchase equipment:', error);
      return false;
    }
  },

  startChallenge: async (id: string) => {
    try {
      const result = await gameApi.startChallenge(id);
      set({ activeChallenge: result.challenge });
    } catch (error) {
      console.error('Failed to start challenge:', error);
    }
  },

  dismissAchievementPopup: () => {
    set({ showAchievementPopup: null });
  },

  dismissLevelUpPopup: () => {
    set({ showLevelUpPopup: false });
  },

  handleAchievementUnlocked: (achievement: Achievement) => {
    set((state) => ({
      showAchievementPopup: achievement,
      unlockedAchievements: [...state.unlockedAchievements, achievement],
    }));
  },

  handleLevelUp: (newLevel: number) => {
    set({ showLevelUpPopup: true, newLevel });
    // Refresh progress to get new XP requirements
    get().fetchProgress();
  },

  handleCurrencyEarned: (amount: number) => {
    set((state) => {
      if (!state.progress) return state;
      return {
        progress: {
          ...state.progress,
          credits: state.progress.credits + amount,
        },
      };
    });
  },
}));
