import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { HomeScreen } from './screens/HomeScreen';
import { WallScreen } from './screens/WallScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AuthScreen } from './screens/AuthScreen';
import { PendingApproval } from './components/PendingApproval';
import { MemberProfile } from './services/firebase';

function MainApp() {
  const { user, isApproved, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [chatTargetMember, setChatTargetMember] = useState<MemberProfile | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-[#FFE5EF] flex items-center justify-center text-3xl border-2 border-[#FFD2E4] animate-bounce">
          🌷
        </div>
        <p className="text-sm font-bold text-[#493744] mt-3">
          TrioBloom is blooming...
        </p>
        <p className="text-xs text-[#927F8C] mt-1">Four hearts, one story 🌸</p>
      </div>
    );
  }

  // Not authenticated: always show real AuthScreen (no bottom nav)
  if (!user) {
    return <AuthScreen />;
  }

  // Authenticated but not an approved circle member: show PendingApproval screen
  if (!isApproved) {
    return <PendingApproval />;
  }

  const handleNavigate = (tab: NavTab, targetMember?: MemberProfile) => {
    if (targetMember) {
      setChatTargetMember(targetMember);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FDF5F2] text-[#493744] flex justify-center">
      {/* Centered mobile-first container */}
      <div className="w-full max-w-md bg-[#FFF8F5] min-h-screen flex flex-col relative shadow-2xl border-x border-[#F3E6EE]/80">
        {/* Compact Header */}
        <Header activeTab={activeTab} />

        {/* Dynamic Screen Viewport */}
        <main className="flex-1 p-3.5 pb-20 overflow-y-auto">
          {activeTab === 'home' && <HomeScreen onNavigate={handleNavigate} />}
          {activeTab === 'wall' && <WallScreen />}
          {activeTab === 'quiz' && <QuizScreen />}
          {activeTab === 'chat' && <ChatScreen initialTargetMember={chatTargetMember} />}
          {activeTab === 'profile' && <ProfileScreen />}
        </main>

        {/* Fixed Bottom Navigation Bar */}
        <Navigation activeTab={activeTab} onSelectTab={handleNavigate} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
