import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FOUR_FRIENDS, FriendPreset } from '../constants/friends';
import {
  User,
  ShieldCheck,
  LogOut,
  Sparkles,
  Heart,
  Calendar,
  Flower2,
  Lock,
  RefreshCw,
  Info,
  Check
} from 'lucide-react';

interface ProfileScreenProps {
  onOpenAuthModal: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenAuthModal }) => {
  const {
    user,
    member,
    activeFriend,
    isApproved,
    isAdmin,
    logout,
    switchFriendIdentity,
    updateMemberProfile
  } = useAuth();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [displayNameInput, setDisplayNameInput] = useState<string>(
    member?.displayName || activeFriend.name
  );
  const [bioInput, setBioInput] = useState<string>(
    member?.bio || activeFriend.bio
  );
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) return;

    await updateMemberProfile({
      displayName: displayNameInput.trim(),
      bio: bioInput.trim()
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    setIsEditing(false);
  };

  const currentEmail = user?.email || activeFriend.email;
  const currentDisplayName = member?.displayName || activeFriend.name;
  const currentBio = member?.bio || activeFriend.bio;

  return (
    <div className="space-y-4 pb-6">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#F3E6EE] shadow-card relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div
              className={`w-14 h-14 rounded-3xl flex items-center justify-center font-bold text-xl border-2 shadow-soft ${
                activeFriend.avatarBg
              }`}
            >
              {activeFriend.avatarText}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-base font-bold text-[#493744]">
                  {currentDisplayName}
                </h3>
                <span className="text-base select-none">{activeFriend.flowerEmoji}</span>
              </div>
              <p className="text-xs text-[#927F8C] truncate max-w-[180px]">
                {currentEmail}
              </p>
              <div className="mt-1 flex items-center space-x-1.5">
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE5EF] text-[#C44780]">
                  <ShieldCheck size={12} />
                  <span>{isAdmin ? 'Group Admin' : 'Approved Bestie'}</span>
                </span>
                <span className="text-[10px] font-semibold text-[#927F8C] bg-[#FFF8F5] px-2 py-0.5 rounded-full border border-[#F3E6EE]">
                  {activeFriend.flowerTitle}
                </span >
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-semibold text-[#C44780] hover:underline px-2 py-1 rounded-xl bg-[#FFF8F5] border border-[#F3E6EE]"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Bio */}
        {!isEditing ? (
          <p className="text-xs text-[#493744] mt-3.5 p-3 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE] leading-relaxed italic">
            "{currentBio}"
          </p>
        ) : (
          <form onSubmit={handleSaveProfile} className="mt-3.5 space-y-2.5">
            <div>
              <label className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider block mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                maxLength={50}
                className="w-full p-2 text-xs text-[#493744] bg-[#FFF8F5] border border-[#F3E6EE] rounded-xl focus:outline-none focus:border-[#C44780]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider block mb-1">
                Friendship Motto / Bio
              </label>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full p-2 text-xs text-[#493744] bg-[#FFF8F5] border border-[#F3E6EE] rounded-xl focus:outline-none focus:border-[#C44780]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-[#C44780] hover:bg-[#B03A70] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Save Profile Changes 🌸
            </button>
          </form>
        )}

        {saveSuccess && (
          <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center space-x-1.5">
            <Check size={14} />
            <span>Profile successfully updated!</span>
          </div>
        )}
      </div>

      {/* Switch Demo/Friend Perspective for Review and Testing */}
      <div className="bg-white rounded-3xl p-4 border border-[#F3E6EE] shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <RefreshCw size={15} className="text-[#C44780]" />
            <h4 className="text-xs font-bold text-[#493744]">
              Simulate Friend Perspective
            </h4>
          </div>
          <span className="text-[10px] font-bold bg-[#F0E8FF] text-[#7F4EAA] px-2 py-0.5 rounded-full">
            Reviewer Tool
          </span>
        </div>
        <p className="text-[11px] text-[#927F8C] mb-3 leading-snug">
          Instantly switch perspective to test chats, reactions, and private isolation across the four friends.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {FOUR_FRIENDS.map((f) => {
            const isCurrent = (activeFriend.id === f.id);
            return (
              <button
                key={f.id}
                onClick={() => switchFriendIdentity(f)}
                className={`p-2.5 rounded-2xl border text-left transition-all flex items-center space-x-2 ${
                  isCurrent
                    ? 'bg-[#FFE5EF] border-[#FFD2E4] shadow-xs'
                    : 'bg-[#FFF8F5] border-[#F3E6EE] hover:border-[#FFD2E4]'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border shrink-0 ${f.avatarBg}`}>
                  {f.avatarText}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#493744] truncate">
                    {f.name} {f.flowerEmoji}
                  </p>
                  <p className="text-[10px] text-[#C44780] truncate font-medium">
                    {f.flowerTitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* The Four Besties Circle Directory */}
      <div className="bg-white rounded-3xl p-4 border border-[#F3E6EE] shadow-soft">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#927F8C] mb-3">
          Our Circle of Four 🌸
        </h4>
        <div className="space-y-2.5">
          {FOUR_FRIENDS.map((f) => (
            <div
              key={f.id}
              className="p-2.5 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE] flex items-center justify-between"
            >
              <div className="flex items-center space-x-2.5">
                <span className="text-lg select-none">{f.flowerEmoji}</span>
                <div>
                  <h5 className="text-xs font-bold text-[#493744]">
                    {f.name}
                  </h5>
                  <p className="text-[10px] text-[#927F8C]">
                    Fav: {f.favoriteFlower} • Bday: {f.birthday}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#C44780] bg-[#FFE5EF] px-2 py-0.5 rounded-full">
                {f.flowerTitle}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Account Settings & Auth Actions */}
      <div className="bg-white rounded-3xl p-4 border border-[#F3E6EE] shadow-soft space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#927F8C] mb-2">
          Security & Access
        </h4>

        {user ? (
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck size={14} /> Signed In with Firebase Auth
            </p>
            <p className="text-[11px] text-emerald-700">
              UID: <span className="font-mono text-[10px]">{user.uid}</span>
            </p>
          </div>
        ) : (
          <div className="p-3 bg-[#FFF8F5] rounded-2xl border border-[#F3E6EE] text-xs text-[#493744] flex items-center justify-between">
            <div>
              <p className="font-bold">Firebase Account</p>
              <p className="text-[10px] text-[#927F8C]">Log in with your email or Google</p>
            </div>
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 bg-[#C44780] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#B03A70] transition-colors"
            >
              Sign In
            </button>
          </div>
        )}

        {user && (
          <button
            onClick={() => logout()}
            className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
          >
            <LogOut size={14} />
            <span>Sign Out of TrioBloom</span>
          </button>
        )}
      </div>

      {/* App Info Footer */}
      <div className="text-center pt-2 pb-4 text-[#927F8C]">
        <p className="text-xs font-bold text-[#493744]">
          TrioBloom 🌷 • Four hearts, one story
        </p>
        <p className="text-[10px] mt-0.5">
          Private, secure & mobile-first for Palak, Priya, Hanshika & You
        </p>
      </div>
    </div>
  );
};
