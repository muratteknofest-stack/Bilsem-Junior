import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/data-service';
import { userProfileUpdateSchema, formatZodError } from '../lib/validations';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  loginLocally: (profile: UserProfile) => void;
  sendEmailVerification: (user: User) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
  updateProfile: async () => {},
  loginLocally: () => {},
  sendEmailVerification: async () => {},
  sendPasswordResetEmail: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (dataService.isAuthenticated()) {
      return dataService.getCurrentUser();
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const loginLocally = (profile: UserProfile) => {
    setUserProfile(profile);
    dataService.setCurrentUser(profile);
  };

  useEffect(() => {
    let unsubSnap: (() => void) | null = null;
    let isMounted = true;

    // Safety timeout: ensure loading state unblocks within 1.2s even if Firebase Auth is slow or unreachable
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 1200);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!isMounted) return;
        if (unsubSnap) {
          unsubSnap();
          unsubSnap = null;
        }

        setCurrentUser(user);
        if (user) {
          // Real-time updates and validation for user profile from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          
          try {
            // Check if document exists, if not initialize fallback
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
              const fallbackProfile: UserProfile = {
                id: user.uid,
                email: user.email || '',
                name: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
                role: 'student' as UserRole,
                grade: 2,
                avatar: '🦊',
                level: 1,
                xp: 0,
                streak: 1,
                lastActiveDate: new Date().toISOString(),
                dailyGoalMinutes: 15,
                todayMinutesSpent: 0,
                soundEnabled: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                totalPoints: 0,
              };
              await setDoc(userDocRef, fallbackProfile, { merge: true });
              if (isMounted) {
                setUserProfile(fallbackProfile);
                dataService.syncUserFromFirebase(fallbackProfile);
              }
            }
          } catch (err) {
            console.warn('Notice: Firestore user document fetch skipped:', err);
          }

          try {
            unsubSnap = onSnapshot(
              userDocRef,
              (snap) => {
                if (snap.exists() && isMounted) {
                  const profile = snap.data() as UserProfile;
                  setUserProfile(profile);
                  dataService.syncUserFromFirebase(profile);
                }
              },
              (snapErr) => {
                console.warn('Notice: Firestore snapshot listener notice:', snapErr);
              }
            );
          } catch {}
          
          updateDoc(userDocRef, { lastLoginAt: Date.now() }).catch(() => {});
          if (isMounted) setLoading(false);
        } else {
          // If user signed out of Firebase, check if active local session is running
          if (dataService.isAuthenticated()) {
            const local = dataService.getCurrentUser();
            if (isMounted) setUserProfile(local);
          } else {
            if (isMounted) setUserProfile(null);
          }
          if (isMounted) setLoading(false);
        }
      },
      (authError) => {
        // Handle auth/network-request-failed or offline without crashing or throwing
        console.warn('Firebase Auth network state notice (handled):', authError.message || authError);
        if (dataService.isAuthenticated() && isMounted) {
          setUserProfile(dataService.getCurrentUser());
        }
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (unsubSnap) unsubSnap();
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout handled:', e);
    }
    dataService.logout();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    // Validate with Zod schema before sending updates
    const parseResult = userProfileUpdateSchema.safeParse(data);
    if (!parseResult.success) {
      const { firstMessage } = formatZodError(parseResult.error);
      throw new Error(firstMessage);
    }

    // Always update locally first
    if (userProfile) {
      const updated = { ...userProfile, ...data, updatedAt: Date.now() };
      setUserProfile(updated);
      dataService.setCurrentUser(updated);
    }

    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const updatedData = { ...data, updatedAt: Date.now() };
        await updateDoc(userDocRef, updatedData);
      } catch (error) {
        console.warn("Notice: Firestore profile update skipped:", error);
      }
    }
  };

  const sendEmailVerification = async (user: User) => {
    try {
      await firebaseSendEmailVerification(user);
    } catch (error) {
      console.warn("Notice: Verification email skipped:", error);
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.warn("Notice: Password reset email skipped:", error);
      if (error.code !== 'auth/network-request-failed') {
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      userProfile, 
      loading, 
      logout, 
      updateProfile,
      loginLocally,
      sendEmailVerification,
      sendPasswordResetEmail
    }}>
      {!loading ? children : (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
