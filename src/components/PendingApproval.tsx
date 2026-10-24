import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Clock, Heart, LogOut } from 'lucide-react';

export const PendingApproval: React.FC = () => {
  const { user, member, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-[#F3E6EE] shadow-card text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FFE5EF] flex items-center justify-center text-3xl border-2 border-[#FFD2E4] animate-pulse">
          🌷
        </div>

        <div>
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} />
            <span>Pending Friend Approval</span>
          </span>

          <h2 className="text-lg font-bold text-[#493744] mt-3">
            Waiting for Bestie Approval 🌸
          </h2>
          <p className="text-xs text-[#927F8C] mt-1.5 leading-relaxed">
            TrioBloom is a private sanctuary strictly reserved for Palak, Priya, Hanshika, and You. Your account ({user?.email || member?.email}) has been registered and is pending approval from the group administrator.
          </p>
        </div>

        <div className="p-3.5 bg-[#FFF8F5] rounded-2xl border border-[#F3E6EE] text-left text-xs text-[#493744] space-y-1">
          <p className="font-bold text-[#C44780] flex items-center gap-1.5">
            <Lock size={13} /> Strict Access Rules Active
          </p>
          <p className="text-[11px] text-[#927F8C]">
            Only approved members can read wall posts, join the bloom chat, or take group quizzes.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => logout()}
            className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
