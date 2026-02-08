// Tutorial state management

import { create } from 'zustand';
import { tutorials, type TutorialStep } from '../components/TutorialOverlay';

interface Tutorial {
  id: string;
  name: string;
  steps: TutorialStep[];
}

interface TutorialState {
  // Current tutorial
  activeTutorial: Tutorial | null;
  completedTutorials: string[];

  // Actions
  startTutorial: (tutorialId: string) => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  isCompleted: (tutorialId: string) => boolean;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  activeTutorial: null,
  completedTutorials: [],

  startTutorial: (tutorialId: string) => {
    const tutorial = tutorials[tutorialId as keyof typeof tutorials];
    if (tutorial) {
      set({ activeTutorial: tutorial });
    }
  },

  completeTutorial: () => {
    const { activeTutorial, completedTutorials } = get();
    if (activeTutorial) {
      set({
        activeTutorial: null,
        completedTutorials: [...completedTutorials, activeTutorial.id],
      });
    }
  },

  skipTutorial: () => {
    set({ activeTutorial: null });
  },

  isCompleted: (tutorialId: string) => {
    return get().completedTutorials.includes(tutorialId);
  },
}));
