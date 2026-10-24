import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FOUR_FRIENDS, FriendPreset } from '../constants/friends';
import { X, Mail, Lock, User, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginWithGoogle, resetPassword, switchFriendIdentity } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        onClose();
      } else if (mode === 'register') {
        if (!name.trim()) {
          setErrorMsg('Please enter your name 🌸');
          setLoading(false);
          return;
        }
        await register(email.trim(), password, name.trim());
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(email.trim());
        setInfoMsg('Password reset email sent! Check your inbox 🌷');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Incorrect email or password.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in!';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFriend = (friend: FriendPreset) => {
    switchFriendIdentity(friend);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-[#F3E6EE] shadow-card relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-[#927F8C] hover:text-[#493744] p-1.5 rounded-full hover:bg-[#FFF8F5]"
        >
          <X size={18} />
        </button>

        {/* Brand */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFE5EF] flex items-center justify-center text-2xl mb-2 border border-[#FFD2E4]">
            🌷
          </div>
          <h3 className="text-base font-bold text-[#493744]">
            {mode === 'login' ? 'Welcome to TrioBloom' : mode === 'register' ? 'Join TrioBloom' : 'Reset Password'}
          </h3>
          <p className="text-xs text-[#927F8C] mt-0.5">
            Private friendship sanctuary for the four of us 🌸
          </p>
        </div>

        {/* Tabs for Mode */}
        <div className="grid grid-cols-2 gap-1 bg-[#FFF8F5] p-1 rounded-2xl mb-4 border border-[#F3E6EE]">
          <button
            onClick={() => { setMode('login'); setErrorMsg(null); setInfoMsg(null); }}
            className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'login' ? 'bg-[#C44780] text-white shadow-xs' : 'text-[#927F8C]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setErrorMsg(null); setInfoMsg(null); }}
            className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'register' ? 'bg-[#C44780] text-white shadow-xs' : 'text-[#927F8C]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
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
                placeholder="bestie@triobloom.app"
                className="w-full py-2.5 pl-9 pr-3 text-xs bg-[#FFF8F5] text-[#493744] border border-[#F3E6EE] rounded-2xl focus:outline-none focus:border-[#C44780]"
              />
              <Mail size={15} className="absolute left-3 top-3 text-[#927F8C]" />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setErrorMsg(null); }}
                    className="text-[10px] text-[#C44780] font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-1.5">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-1.5">
              <CheckCircle size={14} className="shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-[#C44780] to-[#B03A70] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-soft flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <span>
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Friend Account' : 'Send Reset Link'}
            </span>
          </button>
        </form>

        {/* Quick Friend Presets */}
        <div className="mt-5 pt-4 border-t border-[#F3E6EE]">
          <p className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider text-center mb-2.5">
            Or test instantly as one of the four friends
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FOUR_FRIENDS.map((f) => (
              <button
                key={f.id}
                onClick={() => handleQuickFriend(f)}
                className="p-2 rounded-xl bg-[#FFF8F5] hover:bg-[#FFE5EF] border border-[#F3E6EE] hover:border-[#FFD2E4] text-left flex items-center space-x-2 transition-colors"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0 ${f.avatarBg}`}>
                  {f.avatarText}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#493744] truncate block">
                    {f.name} {f.flowerEmoji}
                  </span>
                  <span className="text-[9px] text-[#C44780] font-medium truncate block">
                    {f.role === 'admin' ? 'Admin' : 'Bestie'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
