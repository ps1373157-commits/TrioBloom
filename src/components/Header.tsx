import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Heart } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const { member, activeFriend, user } = useAuth();

  const getTabTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'TrioBloom';
      case 'wall':
        return 'Friendship Wall';
      case 'quiz':
        return 'Bestie Quiz';
      case 'chat':
        return 'Blooming Chat';
      case 'profile':
        return 'My Sanctuary';
      default:
        return 'TrioBloom';
    }
  };

  const displayName = member?.displayName || activeFriend.name;
  const flowerTag = member?.flowerTag || activeFriend.flowerTitle;

  return (
    <header className="sticky top-0 z-30 bg-[#FFF8F5]/90 backdrop-blur-md border-b border-[#F3E6EE] px-4 py-2.5 transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand & Title */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#FFE5EF] to-[#F0E8FF] border border-[#FFD2E4] flex items-center justify-center shadow-xs">
            <span className="text-xl select-none animate-petal">🌷</span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-bold text-[#493744] tracking-tight leading-none">
                {getTabTitle()}
              </h1>
              {activeTab === 'home' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFE5EF] text-[#C44780]">
                  Private
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#927F8C] font-medium leading-tight mt-0.5">
              Four hearts, one story 🌸
            </p>
          </div>
        </div>

        {/* Current Active User Pill */}
        <div className="flex items-center space-x-2 bg-white/80 border border-[#F3E6EE] rounded-full pl-2 pr-1.5 py-1 shadow-xs">
          <span className="text-xs font-semibold text-[#493744] truncate max-w-[80px]">
            {displayName}
          </span>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${activeFriend.avatarBg}`}>
            {activeFriend.avatarText}
          </div>
        </div>
      </div>
    </header>
  );
};
