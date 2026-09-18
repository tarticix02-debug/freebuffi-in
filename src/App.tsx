import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { getProfile } from './storage/profileStore';
import { BottomNav } from './components/nav/BottomNav';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PlayScreen } from './screens/PlayScreen';
import { VariantsScreen } from './screens/VariantsScreen';
import { StatsScreen } from './screens/StatsScreen';
import { GameReviewScreen } from './screens/GameReviewScreen';
import { PuzzleScreen } from './screens/PuzzleScreen';
import { OpeningsScreen } from './screens/OpeningsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { QuestsScreen } from './screens/QuestsScreen';
import { AchievementToast } from './components/achievements/AchievementToast';
import { QuestToast } from './components/quests/QuestToast';
import './styles/tokens.css';
import './styles/global.css';

export function App() {
  const { settings } = useTheme();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    getProfile().then((p) => setOnboarded(p.hasOnboarded));
  }, []);

  if (!settings || onboarded === null) {
    return <div className="app-boot-loading"><div className="spinner" /></div>;
  }

  if (!onboarded) {
    return <WelcomeScreen onDone={() => setOnboarded(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <main className="app-shell__content">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/play" element={<PlayScreen />} />
            <Route path="/play/variant/:variantId" element={<PlayScreen />} />
            <Route path="/variants" element={<VariantsScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/review/:gameId" element={<GameReviewScreen />} />
            <Route path="/puzzle" element={<PuzzleScreen />} />
            <Route path="/openings" element={<OpeningsScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/quests" element={<QuestsScreen />} />
          </Routes>
        </main>
        <AchievementToast />
        <QuestToast />
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
