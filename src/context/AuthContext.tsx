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
  setDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import {
  auth,
  db,
  MemberProfile,
  testConnection,
  handleFirestoreError,
  OperationType
} from '../services/firebase';

interface AuthContextType {
  user: User | null;
  member: MemberProfile | null;
  isApproved: boolean;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, flowerTag?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateMemberProfile: (updates: Partial<MemberProfile>) => Promise<void>;
  adminSetMemberApproval: (uid: string, isApproved: boolean, role?: 'admin' | 'member') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Test connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to real Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthError(null);

      if (firebaseUser) {
        // Real-time listener on the authenticated user's member document
        const memberRef = doc(db, 'members', firebaseUser.uid);
        const unsubMember = onSnapshot(
          memberRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              setMember(snapshot.data() as MemberProfile);
            } else {
              // Self-healing: if member document does not exist yet (e.g. from Google Auth or first login)
              const isAdminEmail = firebaseUser.email === 'ps1373157@gmail.com';
              const initialProfile: MemberProfile = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || 'Flower Friend',
                email: firebaseUser.email || '',
                avatarUrl: 'bg-pink-100 text-pink-600 border-pink-300',
                flowerTag: 'Blooming Petal',
                isApproved: isAdminEmail, // Only the verified project administrator is auto-approved
                role: isAdminEmail ? 'admin' : 'member',
                bio: 'Awaiting blooms in our private friendship circle 🌷',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              };

              try {
                await setDoc(memberRef, initialProfile);
                setMember(initialProfile);
              } catch (err) {
                console.error('Failed to create member profile document:', err);
              }
            }
            setLoading(false);
          },
          (error) => {
            console.error('Member profile listener error:', error.message);
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

  const clearAuthError = () => {
    setAuthError(null);
  };

  // Real Email/Password login
  const login = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'Failed to sign in. Please check your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Email/Password sign-in is disabled in Firebase Console. Please enable it in Authentication > Sign-in method.';
      } else if (err.message) {
        message = err.message;
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  // Real Email/Password registration
  const register = async (email: string, pass: string, name: string, flowerTag?: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await updateProfile(cred.user, { displayName: name.trim() });

      const isAdminEmail = email.trim().toLowerCase() === 'ps1373157@gmail.com';
      const newProfile: MemberProfile = {
        uid: cred.user.uid,
        displayName: name.trim(),
        email: email.trim(),
        avatarUrl: 'bg-pink-100 text-pink-600 border-pink-300',
        flowerTag: flowerTag || 'Blooming Petal',
        isApproved: isAdminEmail, // Only the administrator is auto-approved; all other members require approval
        role: isAdminEmail ? 'admin' : 'member',
        bio: 'Blooming in our private sanctuary 🌷',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'members', cred.user.uid), newProfile);
      setMember(newProfile);
    } catch (err: any) {
      console.error('Registration error:', err);
      let message = 'Failed to create account.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists. Please sign in.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Email/Password registration is disabled in Firebase Console. Please enable it under Authentication > Sign-in method.';
      } else if (err.message) {
        message = err.message;
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  // Real Google Sign-in with popup
  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      let message = 'Google sign-in was cancelled or failed.';
      if (err.code === 'auth/network-request-failed') {
        message = 'Network request to Google Auth failed. This is typically caused by an ad-blocker (such as uBlock Origin or Brave Shields) blocking identitytoolkit.googleapis.com, or an interrupted network connection. Please pause ad-blockers for this preview tab and retry.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        message = 'The Google sign-in window was closed before finishing. Please try again.';
      } else if (err.code === 'auth/popup-blocked') {
        message = 'Your browser blocked the sign-in pop-up window. Please allow pop-ups for this site and retry.';
      } else if (err.code === 'auth/unauthorized-domain') {
        message = 'This preview domain is not yet authorized in Firebase. Please add this domain under Firebase Console > Authentication > Settings > Authorized domains.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        message = 'Sign-in was cancelled because another sign-in window was opened.';
      } else if (err.message) {
        message = err.message;
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  // Real Sign Out
  const logout = async () => {
    setAuthError(null);
    await firebaseSignOut(auth);
    setMember(null);
  };

  // Real Password Reset
  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.error('Password reset error:', err);
      let message = 'Could not send reset email.';
      if (err.code === 'auth/user-not-found') {
        message = 'No account exists with this email address.';
      } else if (err.message) {
        message = err.message;
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  // Update own member profile (only permitted fields)
  const updateMemberProfile = async (updates: Partial<MemberProfile>) => {
    if (!user) throw new Error('Must be signed in to update profile');

    const memberRef = doc(db, 'members', user.uid);
    // Whitelist only allowed fields to prevent client-side privilege escalation
    const safeUpdates: Record<string, any> = {
      updatedAt: serverTimestamp()
    };
    if (updates.displayName !== undefined) safeUpdates.displayName = updates.displayName.slice(0, 50);
    if (updates.avatarUrl !== undefined) safeUpdates.avatarUrl = updates.avatarUrl.slice(0, 200);
    if (updates.flowerTag !== undefined) safeUpdates.flowerTag = updates.flowerTag.slice(0, 50);
    if (updates.bio !== undefined) safeUpdates.bio = updates.bio.slice(0, 200);

    try {
      await updateDoc(memberRef, safeUpdates);
      setMember((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${user.uid}`);
    }
  };

  // Administrator approval of circle members
  const adminSetMemberApproval = async (
    targetUid: string,
    isApprovedStatus: boolean,
    role: 'admin' | 'member' = 'member'
  ) => {
    const isAdminUser = user?.email === 'ps1373157@gmail.com' || member?.role === 'admin';
    if (!isAdminUser) {
      throw new Error('Unauthorized: Only administrators can approve members.');
    }

    const memberRef = doc(db, 'members', targetUid);
    try {
      await updateDoc(memberRef, {
        isApproved: isApprovedStatus,
        role,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${targetUid}`);
    }
  };

  // Security derivation: isApproved and isAdmin are strictly derived from real state
  const isAdmin = user?.email === 'ps1373157@gmail.com' || member?.role === 'admin';
  const isApproved = Boolean(member?.isApproved) || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        member,
        isApproved,
        isAdmin,
        loading,
        authError,
        clearAuthError,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
        updateMemberProfile,
        adminSetMemberApproval
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
