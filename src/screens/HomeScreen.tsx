import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FOUR_FRIENDS, FriendPreset } from '../constants/friends';
import { Sparkles, MessageCircleHeart, HelpCircle, Heart, ArrowRight, MessageSquare, Flower2 } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, WallPostItem, ChatMessageItem } from '../services/firebase';
import { formatFriendlyTime } from '../utils/friendship';
import { NavTab } from '../components/Navigation';

interface HomeScreenProps {
  onNavigate: (tab: NavTab, friendTarget?: FriendPreset) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { member, activeFriend } = useAuth();
  const [latestPost, setLatestPost] = useState<WallPostItem | null>(null);
  const [latestMessage, setLatestMessage] = useState<ChatMessageItem | null>(null);

  // Time-based friendly greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, sunshine! 🌸';
    if (hour < 17) return 'Good afternoon, sweet bestie! 🌷';
    return 'Good evening, lovely soul! 🌙';
  };

  // Fetch real latest activity from Firestore
  useEffect(() => {
    // Latest wall post
    try {
      const qPosts = query(collection(db, 'wall_posts'), orderBy('createdAt', 'desc'), limit(1));
      const unsubPosts = onSnapshot(qPosts, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setLatestPost({ id: snapshot.docs[0].id, ...docData } as WallPostItem);
        } else {
          setLatestPost(null);
        }
      }, (err) => {
        console.warn('Real-time post listener note:', err.message);
      });

      // Latest group chat message
      const qMsg = query(collection(db, 'conversations/group_triobloom/messages'), orderBy('createdAt', 'desc'), limit(1));
      const unsubMsg = onSnapshot(qMsg, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setLatestMessage({ id: snapshot.docs[0].id, ...docData } as ChatMessageItem);
        } else {
          setLatestMessage(null);
        }
      }, (err) => {
        console.warn('Real-time message listener note:', err.message);
      });

      return () => {
        unsubPosts();
        unsubMsg();
      };
    } catch (e) {
      console.warn('Firestore activity query note:', e);
    }
  }, []);

  const currentName = member?.displayName || activeFriend.name;

  return (
    <div className="space-y-4 pb-6">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-[#FFE5EF] via-[#FFF0F6] to-[#F0E8FF] rounded-3xl p-4.5 border border-[#FFD2E4] shadow-soft relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 text-6xl opacity-15 select-none pointer-events-none">
          🌸
        </div>
        <div className="relative z-10">
          <span className="text-xs font-bold text-[#C44780] tracking-wider uppercase flex items-center gap-1.5">
            <span className="animate-spin inline-block">✨</span> Welcome to our garden
          </span>
          <h2 className="text-lg font-bold text-[#493744] mt-0.5 leading-snug">
            {getGreeting()}
          </h2>
          <p className="text-xs text-[#927F8C] mt-1">
            Hi <span className="font-semibold text-[#C44780]">{currentName}</span>, all 4 besties are blooming together today.
          </p>
        </div>
      </div>

      {/* Hero Card: Our friendship, in full bloom */}
      <div className="bg-white rounded-3xl p-4 border border-[#F3E6EE] shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🌸</span>
            <h3 className="text-sm font-bold text-[#493744]">
              Our friendship, in full bloom
            </h3>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFE5EF] text-[#C44780]">
            4 Hearts Intertwined
          </span>
        </div>
        <p className="text-xs text-[#927F8C] leading-relaxed">
          Palak, Priya, Hanshika, and You. Through midnight calls, belly laughs, exam stress, and coffee dates — one unbreakable story.
        </p>

        {/* Mini stats row */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#F7EDF3]">
          <div className="bg-[#FFF8F5] rounded-2xl p-2 text-center">
            <span className="text-xs font-bold text-[#C44780]">4</span>
            <p className="text-[10px] text-[#927F8C] font-medium">Soulmates</p>
          </div>
          <div className="bg-[#FFF8F5] rounded-2xl p-2 text-center">
            <span className="text-xs font-bold text-[#C44780]">Infinite</span>
            <p className="text-[10px] text-[#927F8C] font-medium">Inside Jokes</p>
          </div>
          <div className="bg-[#FFF8F5] rounded-2xl p-2 text-center">
            <span className="text-xs font-bold text-[#C44780]">Forever</span>
            <p className="text-[10px] text-[#927F8C] font-medium">Unbreakable</p>
          </div>
        </div>
      </div>

      {/* The 4 Friendship Cards */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#927F8C]">
            Our Four Petals 🌸
          </h3>
          <span className="text-[11px] text-[#C44780] font-medium">Tap to whisper</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {FOUR_FRIENDS.map((friend) => {
            const isMe = friend.email.toLowerCase() === (member?.email || activeFriend.email).toLowerCase();
            return (
              <div
                key={friend.id}
                className={`bg-white rounded-2xl p-3 border ${friend.colorBorder} shadow-xs hover:shadow-soft transition-all relative flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border ${friend.avatarBg}`}
                    >
                      {friend.avatarText}
                    </div>
                    <span className="text-base select-none">{friend.flowerEmoji}</span>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center space-x-1">
                      <h4 className="text-sm font-bold text-[#493744]">
                        {friend.name}
                      </h4>
                      {isMe && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#FFE5EF] text-[#C44780] rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#C44780] font-medium leading-none mt-0.5">
                      {friend.flowerTitle}
                    </p>
                  </div>

                  <p className="text-[11px] text-[#927F8C] line-clamp-2 mt-1.5 leading-snug">
                    {friend.status}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#F7EDF3]">
                  <button
                    onClick={() => onNavigate('chat', friend)}
                    className="w-full py-1.5 px-2 bg-[#FFF8F5] hover:bg-[#FFE5EF] text-[#C44780] rounded-xl text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                  >
                    <span>{isMe ? 'Open My Chat' : `Chat with ${friend.name}`}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Access Actions Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#927F8C] mb-2.5 px-1">
          Quick Access 🌷
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onNavigate('wall')}
            className="flex items-center space-x-3 p-3 bg-white rounded-2xl border border-[#F3E6EE] shadow-xs hover:border-[#FFD2E4] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#FFE5EF] text-[#C44780] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#493744]">Memory Wall</p>
              <p className="text-[10px] text-[#927F8C]">Post cute moments</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('quiz')}
            className="flex items-center space-x-3 p-3 bg-white rounded-2xl border border-[#F3E6EE] shadow-xs hover:border-[#F0E8FF] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#F0E8FF] text-[#7F4EAA] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <HelpCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#493744]">Bestie Quiz</p>
              <p className="text-[10px] text-[#927F8C]">Who knows who best?</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center space-x-3 p-3 bg-white rounded-2xl border border-[#F3E6EE] shadow-xs hover:border-[#FFE5EF] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#FFE5EF] text-[#C44780] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageCircleHeart size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#493744]">Bloom Group</p>
              <p className="text-[10px] text-[#927F8C]">All 4 chatting live</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="flex items-center space-x-3 p-3 bg-white rounded-2xl border border-[#F3E6EE] shadow-xs hover:border-[#F3E6EE] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E6] text-[#D96B27] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Flower2 size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#493744]">Friend Sanctum</p>
              <p className="text-[10px] text-[#927F8C]">Profiles & statuses</p>
            </div>
          </button>
        </div>
      </div>

      {/* Real Recent Activity Section */}
      <div className="bg-white rounded-3xl p-4 border border-[#F3E6EE] shadow-soft">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#927F8C]">
            Recent Garden Whispers 💌
          </h3>
          <span className="text-[10px] text-[#C44780] font-semibold">Live</span>
        </div>

        {latestPost || latestMessage ? (
          <div className="space-y-2">
            {latestPost && (
              <div
                onClick={() => onNavigate('wall')}
                className="cursor-pointer p-2.5 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE] hover:border-[#FFD2E4] transition-all flex items-start space-x-2.5"
              >
                <span className="text-base shrink-0 mt-0.5">🌸</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#493744] truncate">
                      {latestPost.authorName} on Wall
                    </p>
                    <span className="text-[10px] text-[#927F8C] shrink-0">
                      {formatFriendlyTime(latestPost.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[#927F8C] truncate mt-0.5">
                    "{latestPost.content}"
                  </p>
                </div>
              </div>
            )}

            {latestMessage && (
              <div
                onClick={() => onNavigate('chat')}
                className="cursor-pointer p-2.5 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE] hover:border-[#FFD2E4] transition-all flex items-start space-x-2.5"
              >
                <span className="text-base shrink-0 mt-0.5">💬</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#493744] truncate">
                      {latestMessage.senderName} in Bloom Group
                    </p>
                    <span className="text-[10px] text-[#927F8C] shrink-0">
                      {formatFriendlyTime(latestMessage.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[#927F8C] truncate mt-0.5">
                    {latestMessage.text}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 px-2">
            <span className="text-2xl select-none inline-block animate-bounce">🌱</span>
            <p className="text-xs font-bold text-[#493744] mt-1">Our garden is fresh and quiet</p>
            <p className="text-[11px] text-[#927F8C] mt-0.5">
              Be the first to share a memory on the Wall or send a message in Chat!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
