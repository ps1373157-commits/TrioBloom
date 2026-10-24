import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import {
  auth,
  db,
  MemberProfile,
  testConnection,
  handleFirestoreError,
  OperationType
} from '../services/firebase';
import { FOUR_FRIENDS, FriendPreset } from '../constants/friends';
import { isUserApproved } from '../utils/friendship';

const FRIEND_PASSWORD = 'TrioBloom!4Hearts';

interface AuthContextType {
  user: User | null;
  member: MemberProfile | null;
  isApproved: boolean;
  isAdmin: boolean;
  loading: boolean;
  isDemoMode: boolean;
  authError: string | null;
  activeFriend: FriendPreset;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInAsFriend: (friend: FriendPreset) => Promise<void>;
  enterDemoMode: (friend: FriendPreset) => void;
  switchFriendIdentity: (friend: FriendPreset) => void;
  updateMemberProfile: (updates: Partial<MemberProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeFriend, setActiveFriend] = useState<FriendPreset>(FOUR_FRIENDS[3]);

  // Test connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsDemoMode(false);
        const matched = FOUR_FRIENDS.find(f => f.email.toLowerCase() === firebaseUser.email?.toLowerCase());
        if (matched) {
          setActiveFriend(matched);
        }

        const memberRef = doc(db, 'members', firebaseUser.uid);
        const unsubMember = onSnapshot(
          memberRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              setMember(snapshot.data() as MemberProfile);
            } else {
              const isAdminEmail = firebaseUser.email === 'ps1373157@gmail.com';
              const isMatchedFriend = FOUR_FRIENDS.some(f => f.email.toLowerCase() === firebaseUser.email?.toLowerCase());
              const defaultProfile: MemberProfile = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || matched?.name || 'Friend',
                email: firebaseUser.email || '',
                avatarUrl: matched?.avatarBg || 'bg-pink-100 text-pink-600 border-pink-300',
                flowerTag: matched?.flowerTitle || 'Blossom Flower',
                isApproved: isAdminEmail || isMatchedFriend,
                role: isAdminEmail ? 'admin' : 'member',
                bio: matched?.bio || 'Blooming together in our private sanctuary 🌷',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              };

              try {
                await setDoc(memberRef, defaultProfile);
                setMember(defaultProfile);
              } catch (err) {
                console.warn('Error seeding member profile:', err);
              }
            }
            setLoading(false);
          },
          (error) => {
            console.warn('Member profile listener note:', error.message);
            setLoading(false);
          }
        );

        return () => unsubMember();
      } else {
        setMember(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setAuthError(null);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string, name: string) => {
    setAuthError(null);
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    const matched = FOUR_FRIENDS.find(f => f.email.toLowerCase() === email.toLowerCase());
    const isAdminEmail = email === 'ps1373157@gmail.com';
    const isMatched = Boolean(matched);

    const newProfile: MemberProfile = {
      uid: cred.user.uid,
      displayName: name,
      email,
      avatarUrl: matched?.avatarBg || 'bg-pink-100 text-pink-600 border-pink-300',
      flowerTag: matched?.flowerTitle || 'Blossom Flower',
      isApproved: isAdminEmail || isMatched,
      role: isAdminEmail ? 'admin' : 'member',
      bio: matched?.bio || 'Blooming together in our private sanctuary 🌷',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'members', cred.user.uid), newProfile);
      setMember(newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `members/${cred.user.uid}`);
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    setIsDemoMode(false);
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const enterDemoMode = (friend: FriendPreset) => {
    setActiveFriend(friend);
    setIsDemoMode(true);
    setMember({
      uid: friend.id,
      displayName: friend.name,
      email: friend.email,
      avatarUrl: friend.avatarBg,
      flowerTag: friend.flowerTitle,
      isApproved: true,
      role: friend.role,
      bio: friend.bio,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  };

  // Sign in as one of the four friends
  const signInAsFriend = async (friend: FriendPreset) => {
    setAuthError(null);
    setActiveFriend(friend);

    try {
      await signInWithEmailAndPassword(auth, friend.email, FRIEND_PASSWORD);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, friend.email, FRIEND_PASSWORD);
          await updateProfile(cred.user, { displayName: friend.name });
          const isAdmin = friend.email === 'ps1373157@gmail.com';

          const newProfile: MemberProfile = {
            uid: cred.user.uid,
            displayName: friend.name,
            email: friend.email,
            avatarUrl: friend.avatarBg,
            flowerTag: friend.flowerTitle,
            isApproved: true,
            role: isAdmin ? 'admin' : 'member',
            bio: friend.bio,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await setDoc(doc(db, 'members', cred.user.uid), newProfile);
          setMember(newProfile);
        } catch (createErr: any) {
          console.warn('Could not create Firebase account, falling back to Interactive Mode:', createErr.message);
          enterDemoMode(friend);
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        // Email/password not enabled in Firebase Console yet, enter Interactive Mode!
        enterDemoMode(friend);
      } else {
        setAuthError(err.message || 'Authentication error.');
        enterDemoMode(friend);
      }
    }
  };

  const updateMemberProfile = async (updates: Partial<MemberProfile>) => {
    const targetUid = user?.uid;
    if (targetUid) {
      const memberRef = doc(db, 'members', targetUid);
      const updatedData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      try {
        await setDoc(memberRef, updatedData, { merge: true });
      } catch (err) {
        console.warn('Firestore update warning:', err);
      }
    }
    setMember(prev => prev ? { ...prev, ...updates } : null);
  };

  const isApproved = isDemoMode || isUserApproved(member, user?.email || activeFriend.email);
  const isAdmin = user?.email === 'ps1373157@gmail.com' || member?.role === 'admin' || activeFriend.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        member,
        isApproved,
        isAdmin,
        loading,
        isDemoMode,
        authError,
        activeFriend,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
        signInAsFriend,
        enterDemoMode,
        switchFriendIdentity: enterDemoMode,
        updateMemberProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
