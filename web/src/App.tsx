// Main App with routing

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Imaging } from './pages/Imaging';
import { Challenges } from './pages/Challenges';
import { Store } from './pages/Store';
import { Progress } from './pages/Progress';
import { Settings } from './pages/Settings';
import { Equipment } from './pages/Equipment';
import { wsClient, WSEvents } from './api/websocket';
import { useGameStore } from './stores/gameStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { handleAchievementUnlocked, handleLevelUp, handleCurrencyEarned } = useGameStore();

  // Connect WebSocket and set up event handlers
  useEffect(() => {
    wsClient.connect();

    const unsubAchievement = wsClient.subscribe(WSEvents.ACHIEVEMENT_UNLOCKED, (msg) => {
      handleAchievementUnlocked(msg.data as any);
    });

    const unsubLevelUp = wsClient.subscribe(WSEvents.LEVEL_UP, (msg) => {
      handleLevelUp((msg.data as any).level);
    });

    const unsubCurrency = wsClient.subscribe(WSEvents.CURRENCY_EARNED, (msg) => {
      handleCurrencyEarned((msg.data as any).amount);
    });

    return () => {
      unsubAchievement();
      unsubLevelUp();
      unsubCurrency();
      wsClient.disconnect();
    };
  }, [handleAchievementUnlocked, handleLevelUp, handleCurrencyEarned]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="imaging" element={<Imaging />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="store" element={<Store />} />
        <Route path="progress" element={<Progress />} />
        <Route path="settings" element={<Settings />} />
        <Route path="equipment" element={<Equipment />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
