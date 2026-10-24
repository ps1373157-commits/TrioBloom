import React from 'react';
import { Home, Sparkles, HelpCircle, MessageCircleHeart, User } from 'lucide-react';

export type NavTab = 'home' | 'wall' | 'quiz' | 'chat' | 'profile';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0
}) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home, emoji: '🏠' },
    { id: 'wall' as NavTab, label: 'Wall', icon: Sparkles, emoji: '🌸' },
    { id: 'quiz' as NavTab, label: 'Quiz', icon: HelpCircle, emoji: '✨' },
    { id: 'chat' as NavTab, label: 'Chat', icon: MessageCircleHeart, emoji: '💬', badge: unreadCount },
    { id: 'profile' as NavTab, label: 'Profile', icon: User, emoji: '🌷' },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F5]/95 backdrop-blur-lg border-t border-[#F3E6EE] safe-pb transition-all"
    >
      <div className="max-w-md mx-auto px-3 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-label={tab.label}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 group ${
                isActive ? 'text-[#C44780] scale-105' : 'text-[#927F8C] hover:text-[#493744]'
              }`}
            >
              {/* Active ambient glow pill */}
              {isActive && (
                <span className="absolute inset-0 bg-[#FFE5EF] rounded-2xl -z-10 shadow-xs" />
              )}

              <div className="relative">
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={`transition-transform duration-200 ${isActive ? 'stroke-[#C44780]' : ''}`}
                />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#C44780] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#FFF8F5]">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] font-semibold mt-0.5 tracking-tight ${
                  isActive ? 'text-[#C44780]' : 'text-[#927F8C]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
