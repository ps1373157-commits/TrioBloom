import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FOUR_FRIENDS, FriendPreset } from '../constants/friends';
import { Lock, Mail, User, Sparkles, Heart, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, register, resetPassword, signInAsFriend, authError } = useAuth();
  const [tab, setTab] = useState<'friends' | 'custom'>('friends');
  const [customMode, setCustomMode] = useState<'login' | 'register'>('login');

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (customMode === 'login') {
        await login(email.trim(), password);
      } else {
        if (!name.trim()) {
          setErrorMsg('Please enter your name 🌸');
          setLoading(false);
          return;
        }
        await register(email.trim(), password, name.trim());
      }
    } catch (err: any) {
      let msg = err.message || 'Authentication error';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Incorrect email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in!';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendClick = async (friend: FriendPreset) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInAsFriend(friend);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate friend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F5] flex flex-col justify-center px-4 py-8">
      <div className="max-w-md w-full mx-auto space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-[#FFE5EF] to-[#F0E8FF] border border-[#FFD2E4] flex items-center justify-center text-3xl shadow-soft">
            <span className="animate-petal select-none">🌷</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#493744] tracking-tight">
              TrioBloom 🌷
            </h1>
            <p className="text-xs font-semibold text-[#C44780] mt-0.5">
              “Four hearts, one story.”
            </p>
            <p className="text-[11px] text-[#927F8C] max-w-xs mx-auto mt-1">
              A private, aesthetic sanctuary for Palak, Priya, Hanshika, and You.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#FFF0F6] p-1.5 rounded-2xl border border-[#FFD2E4]">
          <button
            onClick={() => { setTab('friends'); setErrorMsg(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              tab === 'friends'
                ? 'bg-[#C44780] text-white shadow-xs'
                : 'text-[#927F8C] hover:text-[#493744]'
            }`}
          >
            <span>Our 4 Friends 🌸</span>
          </button>
          <button
            onClick={() => { setTab('custom'); setErrorMsg(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              tab === 'custom'
                ? 'bg-[#C44780] text-white shadow-xs'
                : 'text-[#927F8C] hover:text-[#493744]'
            }`}
          >
            <span>Email Sign In 💌</span>
          </button>
        </div>

        {/* Tab 1: Instant 4 Friends Access */}
        {tab === 'friends' && (
          <div className="bg-white rounded-3xl p-5 border border-[#F3E6EE] shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#493744] uppercase tracking-wider">
                Select Your Flower Identity 🌸
              </span>
              <span className="text-[10px] text-[#C44780] font-bold bg-[#FFE5EF] px-2 py-0.5 rounded-full">
                1-Tap Entry
              </span>
            </div>
            <p className="text-[11px] text-[#927F8C] leading-snug">
              Choose who you are entering as to access our private group chat, wall memories, and bestie quizzes.
            </p>

            <div className="space-y-2.5 pt-1">
              {FOUR_FRIENDS.map((friend) => (
                <button
                  key={friend.id}
                  disabled={loading}
                  onClick={() => handleFriendClick(friend)}
                  className="w-full p-3 bg-[#FFF8F5] hover:bg-[#FFE5EF] border border-[#F3E6EE] hover:border-[#FFD2E4] rounded-2xl flex items-center justify-between text-left transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border shrink-0 ${friend.avatarBg}`}
                    >
                      {friend.avatarText}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-bold text-[#493744] group-hover:text-[#C44780] transition-colors">
                          {friend.name}
                        </h4>
                        <span className="text-sm select-none">{friend.flowerEmoji}</span>
                      </div>
                      <p className="text-[10px] text-[#C44780] font-semibold">
                        {friend.flowerTitle}
                      </p>
                      <p className="text-[10px] text-[#927F8C] truncate max-w-[180px]">
                        {friend.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-xs font-bold text-[#C44780] pr-1">
                    <span className="text-[11px]">Enter</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Sign In / Sign Up */}
        {tab === 'custom' && (
          <div className="bg-white rounded-3xl p-5 border border-[#F3E6EE] shadow-card space-y-4">
            <div className="flex rounded-xl bg-[#FFF8F5] p-1 border border-[#F3E6EE]">
              <button
                type="button"
                onClick={() => setCustomMode('login')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  customMode === 'login' ? 'bg-[#C44780] text-white shadow-xs' : 'text-[#927F8C]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setCustomMode('register')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  customMode === 'register' ? 'bg-[#C44780] text-white shadow-xs' : 'text-[#927F8C]'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-3">
              {customMode === 'register' && (
                <div>
                  <label className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider block mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Palak, Priya, Hanshika"
                      className="w-full py-2.5 pl-9 pr-3 text-xs bg-[#FFF8F5] text-[#493744] border border-[#F3E6EE] rounded-2xl focus:outline-none focus:border-[#C44780]"
                    />
                    <User size={15} className="absolute left-3 top-3 text-[#927F8C]" />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@triobloom.app"
                    className="w-full py-2.5 pl-9 pr-3 text-xs bg-[#FFF8F5] text-[#493744] border border-[#F3E6EE] rounded-2xl focus:outline-none focus:border-[#C44780]"
                  />
                  <Mail size={15} className="absolute left-3 top-3 text-[#927F8C]" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider block mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full py-2.5 pl-9 pr-3 text-xs bg-[#FFF8F5] text-[#493744] border border-[#F3E6EE] rounded-2xl focus:outline-none focus:border-[#C44780]"
                  />
                  <Lock size={15} className="absolute left-3 top-3 text-[#927F8C]" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-[#C44780] to-[#B03A70] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-soft flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Entering garden...' : customMode === 'login' ? 'Sign In 🌸' : 'Register Account 🌷'}</span>
              </button>
            </form>
          </div>
        )}

        {(errorMsg || authError) && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center space-x-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg || authError}</span>
          </div>
        )}

        {/* Security Note */}
        <div className="p-3 bg-[#FFF8F5] rounded-2xl border border-[#F3E6EE] text-[11px] text-[#927F8C] flex items-center space-x-2">
          <ShieldCheck size={16} className="text-[#C44780] shrink-0" />
          <span>Secured by Firebase Firestore rules with isolated private chat.</span>
        </div>
      </div>
    </div>
  );
};
