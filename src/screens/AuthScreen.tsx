import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AlertCircle, CheckCircle, ArrowRight, ShieldCheck, Flower2 } from 'lucide-react';

const FLOWER_CHOICES = [
  { id: 'Cherry Blossom', label: 'Cherry Blossom 🌸', style: 'bg-pink-100 text-pink-600 border-pink-300' },
  { id: 'Lavender Orchid', label: 'Lavender Orchid 💜', style: 'bg-purple-100 text-purple-600 border-purple-300' },
  { id: 'Buttercup Peony', label: 'Buttercup Peony 🌼', style: 'bg-amber-100 text-amber-600 border-amber-300' },
  { id: 'Blooming Tulip', label: 'Blooming Tulip 🌷', style: 'bg-rose-100 text-rose-600 border-rose-300' },
];

export const AuthScreen: React.FC = () => {
  const { login, register, loginWithGoogle, resetPassword, authError, clearAuthError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedFlower, setSelectedFlower] = useState<string>(FLOWER_CHOICES[0].id);
  const [emailLoading, setEmailLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setInfoMessage(null);
    clearAuthError();
    setEmailLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        if (!name.trim()) {
          setLocalError('Please enter your name 🌸');
          setEmailLoading(false);
          return;
        }
        await register(email, password, name.trim(), selectedFlower);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setInfoMessage('Password reset email sent! Please check your inbox 🌷');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Authentication error.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setInfoMessage(null);
    clearAuthError();
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setLocalError(err.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const displayError = localError || authError;

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
              Private, aesthetic sanctuary for our four besties.
            </p>
          </div>
        </div>

        {/* Auth Mode Toggle */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#FFF0F6] p-1.5 rounded-2xl border border-[#FFD2E4]">
          <button
            onClick={() => {
              setMode('login');
              setLocalError(null);
              setInfoMessage(null);
              clearAuthError();
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-[#C44780] text-white shadow-xs'
                : 'text-[#927F8C] hover:text-[#493744]'
            }`}
          >
            Sign In 🌸
          </button>
          <button
            onClick={() => {
              setMode('register');
              setLocalError(null);
              setInfoMessage(null);
              clearAuthError();
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-[#C44780] text-white shadow-xs'
                : 'text-[#927F8C] hover:text-[#493744]'
            }`}
          >
            Join Circle 💌
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl p-5 border border-[#F3E6EE] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#493744]">
              {mode === 'login'
                ? 'Welcome Back, Bestie 🌸'
                : mode === 'register'
                ? 'Register Your Account 🌷'
                : 'Reset Password ✉️'}
            </h3>
            <span className="text-[10px] text-[#C44780] font-bold bg-[#FFE5EF] px-2 py-0.5 rounded-full">
              Private Access
            </span>
          </div>

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
                    maxLength={50}
                    className="w-full py-2.5 pl-9 pr-3 text-xs bg-[#FFF8F5] text-[#493744] border border-[#F3E6EE] rounded-2xl focus:outline-none focus:border-[#C44780]"
                  />
                  <User size={15} className="absolute left-3 top-3 text-[#927F8C]" />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider block mb-1">
                  Choose Your Flower Vibe 🌸
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FLOWER_CHOICES.map((fl) => (
                    <button
                      type="button"
                      key={fl.id}
                      onClick={() => setSelectedFlower(fl.id)}
                      className={`p-2 rounded-xl text-[11px] font-semibold border text-left transition-all ${
                        selectedFlower === fl.id
                          ? 'border-[#C44780] bg-[#FFE5EF] text-[#C44780] shadow-xs'
                          : 'border-[#F3E6EE] bg-[#FFF8F5] text-[#493744] hover:border-[#FFD2E4]'
                      }`}
                    >
                      {fl.label}
                    </button>
                  ))}
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
                  placeholder="your-email@example.com"
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
                      onClick={() => {
                        setMode('reset');
                        setLocalError(null);
                        setInfoMessage(null);
                        clearAuthError();
                      }}
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

            {mode === 'reset' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLocalError(null);
                    setInfoMessage(null);
                  }}
                  className="text-[11px] text-[#C44780] font-semibold hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {displayError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
                <div className="flex items-start space-x-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                  <span className="leading-snug">{displayError}</span>
                </div>
                {(displayError.includes('network') || displayError.includes('Google') || displayError.includes('pop-up')) && (
                  <div className="pt-1 flex items-center justify-between border-t border-rose-200/60">
                    <span className="text-[10px] text-rose-600 font-medium">Tip: Pause ad-blockers / Brave Shields</span>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      className="px-2.5 py-1 bg-[#C44780] hover:bg-[#B03A70] text-white rounded-xl text-[10px] font-bold shadow-xs transition-colors"
                    >
                      Retry Google Sign-In 🔄
                    </button>
                  </div>
                )}
              </div>
            )}

            {infoMessage && (
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
                <CheckCircle size={15} className="shrink-0 text-emerald-500" />
                <span className="leading-snug">{infoMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={emailLoading || googleLoading}
              className="w-full py-2.5 bg-gradient-to-r from-[#C44780] to-[#B03A70] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-soft flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <span>
                {emailLoading
                  ? 'Verifying...'
                  : mode === 'login'
                  ? 'Sign In to Garden'
                  : mode === 'register'
                  ? 'Create Member Account'
                  : 'Send Reset Link'}
              </span>
              <ArrowRight size={13} />
            </button>
          </form>

          {/* Alternative Google Sign-in */}
          <div className="pt-2 border-t border-[#F3E6EE]">
            <button
              type="button"
              disabled={googleLoading || emailLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-3 bg-[#FFF8F5] hover:bg-[#FFE5EF] border border-[#F3E6EE] rounded-2xl text-xs font-semibold text-[#493744] flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
            >
              <span className="text-sm font-bold text-[#C44780]">G</span>
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>
        </div>

        {/* Security & Access Notice */}
        <div className="p-3 bg-white/80 rounded-2xl border border-[#F3E6EE] text-[11px] text-[#927F8C] flex items-center space-x-2.5 shadow-xs">
          <ShieldCheck size={18} className="text-[#C44780] shrink-0" />
          <p className="leading-snug">
            TrioBloom is restricted to approved members. After registration, your account is verified by the administrator before granting private content access.
          </p>
        </div>
      </div>
    </div>
  );
};
