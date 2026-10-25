import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Sparkles,
  Heart,
  Flower2,
  Check,
  Users,
  Clock,
  UserCheck,
  UserX,
  Edit3
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, MemberProfile } from '../services/firebase';

export const ProfileScreen: React.FC = () => {
  const {
    user,
    member,
    isAdmin,
    logout,
    updateMemberProfile,
    adminSetMemberApproval
  } = useAuth();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [displayNameInput, setDisplayNameInput] = useState<string>(
    member?.displayName || user?.displayName || 'Flower Friend'
  );
  const [flowerTagInput, setFlowerTagInput] = useState<string>(
    member?.flowerTag || 'Blooming Petal'
  );
  const [bioInput, setBioInput] = useState<string>(
    member?.bio || 'Blooming together in our private sanctuary 🌷'
  );
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Admin member management state
  const [allMembers, setAllMembers] = useState<MemberProfile[]>([]);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [adminActionMsg, setAdminActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Synchronize initial input states with member profile
  useEffect(() => {
    if (member) {
      setDisplayNameInput(member.displayName || user?.displayName || 'Flower Friend');
      setFlowerTagInput(member.flowerTag || 'Blooming Petal');
      setBioInput(member.bio || 'Blooming together in our private sanctuary 🌷');
    }
  }, [member, user]);

  // If user is Admin, listen to all registered members in real-time
  useEffect(() => {
    if (!isAdmin) return;

    try {
      const q = query(collection(db, 'members'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: MemberProfile[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as MemberProfile);
          });
          setAllMembers(list);
        },
        (err) => {
          console.warn('Admin members list error:', err.message);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn('Admin members query note:', e);
    }
  }, [isAdmin]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) return;

    setSaving(true);
    try {
      await updateMemberProfile({
        displayName: displayNameInput.trim(),
        flowerTag: flowerTagInput.trim(),
        bio: bioInput.trim()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleApproval = async (targetMember: MemberProfile) => {
    if (!isAdmin) return;
    if (targetMember.uid === user?.uid) {
      setAdminActionMsg({ type: 'error', text: 'You cannot revoke your own admin account.' });
      return;
    }

    setAdminActionLoading(targetMember.uid);
    setAdminActionMsg(null);
    try {
      const nextStatus = !targetMember.isApproved;
      await adminSetMemberApproval(targetMember.uid, nextStatus, targetMember.role || 'member');
      setAdminActionMsg({
        type: 'success',
        text: `Updated ${targetMember.displayName}: ${nextStatus ? 'Approved' : 'Approval Revoked'}`
      });
      setTimeout(() => setAdminActionMsg(null), 3000);
    } catch (err: any) {
      setAdminActionMsg({
        type: 'error',
        text: err.message || 'Failed to update member approval status.'
      });
    } finally {
      setAdminActionLoading(null);
    }
  };

  const currentEmail = user?.email || member?.email || '';
  const currentDisplayName = member?.displayName || user?.displayName || currentEmail.split('@')[0] || 'Friend';
  const avatarLetter = currentDisplayName[0]?.toUpperCase() || '🌸';
  const avatarStyle = member?.avatarUrl || 'bg-pink-100 text-pink-600 border-pink-300';

  return (
    <div className="space-y-4 pb-6">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#F3E6EE] shadow-card relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div
              className={`w-14 h-14 rounded-3xl flex items-center justify-center font-bold text-xl border-2 shadow-soft ${avatarStyle}`}
            >
              {avatarLetter}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-base font-bold text-[#493744]">
                  {currentDisplayName}
                </h3>
                <span className="text-base select-none">🌷</span>
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
                  {member?.flowerTag || 'Blooming Petal'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-semibold text-[#C44780] hover:underline px-2.5 py-1 rounded-xl bg-[#FFF8F5] border border-[#F3E6EE] flex items-center space-x-1"
          >
            <Edit3 size={12} />
            <span>{isEditing ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {/* Bio */}
        {!isEditing ? (
          <p className="text-xs text-[#493744] mt-3.5 p-3 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE] leading-relaxed italic">
            "{member?.bio || 'Blooming together in our private sanctuary 🌷'}"
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
                required
                className="w-full p-2.5 text-xs text-[#493744] bg-[#FFF8F5] border border-[#F3E6EE] rounded-xl focus:outline-none focus:border-[#C44780]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider block mb-1">
                Flower Petal Title
              </label>
              <input
                type="text"
                value={flowerTagInput}
                onChange={(e) => setFlowerTagInput(e.target.value)}
                maxLength={40}
                placeholder="e.g. Daisy Petal, Rose Whisper"
                className="w-full p-2.5 text-xs text-[#493744] bg-[#FFF8F5] border border-[#F3E6EE] rounded-xl focus:outline-none focus:border-[#C44780]"
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
                className="w-full p-2.5 text-xs text-[#493744] bg-[#FFF8F5] border border-[#F3E6EE] rounded-xl focus:outline-none focus:border-[#C44780]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-[#C44780] hover:bg-[#B03A70] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Changes 🌸'}
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

      {/* Admin Member Approval Management Panel (Strictly for Group Admin) */}
      {isAdmin && (
        <div className="bg-white rounded-3xl p-4.5 border border-[#FFD2E4] shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFE5EF] text-[#C44780] flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#493744]">
                  Bestie Approval Management
                </h4>
                <p className="text-[10px] text-[#927F8C]">
                  Administrator control for four friends circle
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-[#FFE5EF] text-[#C44780] px-2 py-0.5 rounded-full">
              Admin Exclusive
            </span>
          </div>

          <p className="text-[11px] text-[#927F8C] leading-snug">
            Approve or revoke registered accounts. Only approved members can access the Friendship Wall, Chat, and Quiz.
          </p>

          {adminActionMsg && (
            <div
              className={`p-2.5 rounded-2xl text-xs flex items-center space-x-1.5 ${
                adminActionMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {adminActionMsg.type === 'success' ? <Check size={14} /> : <ShieldAlert size={14} />}
              <span>{adminActionMsg.text}</span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            {allMembers.length > 0 ? (
              allMembers.map((m) => {
                const isCurrentAdmin = m.uid === user?.uid;
                const isPending = !m.isApproved;
                const isLoading = adminActionLoading === m.uid;

                return (
                  <div
                    key={m.uid}
                    className="p-3 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex items-center space-x-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border shrink-0 ${
                          m.avatarUrl || 'bg-pink-100 text-pink-600 border-pink-300'
                        }`}
                      >
                        {m.displayName ? m.displayName[0].toUpperCase() : '🌸'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className="text-xs font-bold text-[#493744] truncate">
                            {m.displayName}
                          </p>
                          {isCurrentAdmin && (
                            <span className="text-[9px] bg-[#FFE5EF] text-[#C44780] font-bold px-1.5 py-0.2 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#927F8C] truncate">{m.email}</p>
                        <div className="flex items-center space-x-1 mt-0.5">
                          {m.isApproved ? (
                            <span className="inline-flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                              <UserCheck size={10} className="mr-0.5" /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200">
                              <Clock size={10} className="mr-0.5" /> Pending Approval
                            </span>
                          )}
                          <span className="text-[9px] text-[#927F8C]">
                            • {m.flowerTag || 'Petal'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCurrentAdmin && (
                      <button
                        onClick={() => handleToggleApproval(m)}
                        disabled={isLoading}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-xs disabled:opacity-50 ${
                          isPending
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isLoading ? (
                          <span>...</span>
                        ) : isPending ? (
                          <>
                            <UserCheck size={12} />
                            <span>Approve</span>
                          </>
                        ) : (
                          <>
                            <UserX size={12} />
                            <span>Revoke</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-3 text-xs text-[#927F8C]">
                Loading registered members...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Intended Circle of Four Flowers Guide */}
      <div className="bg-white rounded-3xl p-4 border border-[#F3E6EE] shadow-soft">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#927F8C] mb-2.5">
          Intended Circle of Four 🌸
        </h4>
        <p className="text-[11px] text-[#927F8C] mb-3 leading-snug">
          TrioBloom is specially created for Palak, Priya, Hanshika, and You. When your friends register with their email, you can approve them above.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE]">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm">🌷</span>
              <p className="text-xs font-bold text-[#493744]">Palak</p>
            </div>
            <p className="text-[10px] text-[#C44780] font-medium mt-0.5">Tulip Bloom</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE]">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm">🌸</span>
              <p className="text-xs font-bold text-[#493744]">Priya</p>
            </div>
            <p className="text-[10px] text-[#C44780] font-medium mt-0.5">Cherry Blossom</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE]">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm">🌻</span>
              <p className="text-xs font-bold text-[#493744]">Hanshika</p>
            </div>
            <p className="text-[10px] text-[#C44780] font-medium mt-0.5">Sunflower Shine</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#FFF8F5] border border-[#F3E6EE]">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm">✨</span>
              <p className="text-xs font-bold text-[#493744]">You (Admin)</p>
            </div>
            <p className="text-[10px] text-[#C44780] font-medium mt-0.5">Rose Guardian</p>
          </div>
        </div>
      </div>

      {/* Account Info & Sign Out */}
      <div className="bg-white rounded-3xl p-4 border border-[#F3E6EE] shadow-soft space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#927F8C]">
          Account & Device Security
        </h4>

        {user && (
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck size={14} /> Authenticated via Firebase
            </p>
            <p className="text-[11px] text-emerald-700 font-mono break-all">
              UID: {user.uid}
            </p>
            <p className="text-[10px] text-emerald-600">
              Provider: {user.providerData[0]?.providerId || 'password'} • Verified: {user.emailVerified ? 'Yes' : 'No'}
            </p>
          </div>
        )}

        <button
          onClick={() => logout()}
          className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
        >
          <LogOut size={14} />
          <span>Sign Out of TrioBloom</span>
        </button>
      </div>

      {/* App Info Footer */}
      <div className="text-center pt-2 pb-2 text-[#927F8C]">
        <p className="text-xs font-bold text-[#493744]">
          TrioBloom 🌷 • Four hearts, one story
        </p>
        <p className="text-[10px] mt-0.5">
          Production Release • Android & Web Ready
        </p>
      </div>
    </div>
  );
};
