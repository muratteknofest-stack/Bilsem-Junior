import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
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
            // Accounts without an application profile are not silently provisioned.
            const docSnap = await getDoc(userDocRef);
            const isOwnerAdmin = user.email?.toLowerCase() === 'muratteknofest@gmail.com';
            if (!docSnap.exists()) {
              if (isOwnerAdmin) {
                const ownerProfile: UserProfile = {
                  id: user.uid,
                  email: user.email || 'muratteknofest@gmail.com',
                  name: 'ZekaPark Yönetici',
                  role: 'admin',
                  avatar: '👨‍💻',
                  level: 1,
                  xp: 0,
                  streak: 0,
                  lastActiveDate: new Date().toISOString(),
                  dailyGoalMinutes: 20,
                  todayMinutesSpent: 0,
                  soundEnabled: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  totalPoints: 0,
                  claimedStreakDays: [],
                  totalQuestionsSolved: 0,
                  resolvedMistakesCount: 0,
                };
                dataService.loginAs('admin', ownerProfile);
                if (isMounted) setUserProfile(ownerProfile);
                if (isMounted) setLoading(false);
                return;
              }
              await firebaseSignOut(auth).catch(() => undefined);
              dataService.logout();
              if (isMounted) setUserProfile(null);
              if (isMounted) setLoading(false);
              return;
            } else {
              const profile = docSnap.data() as UserProfile;
              if (isOwnerAdmin) profile.role = 'admin';
              if (profile.id !== user.uid || !['student', 'parent', 'admin'].includes(profile.role)) {
                await firebaseSignOut(auth).catch(() => undefined);
                dataService.logout();
                if (isMounted) setUserProfile(null);
                if (isMounted) setLoading(false);
                return;
              }
              dataService.loginAs(profile.role, profile);
              await dataService.hydrateUserStateFromFirebase();
              if (isMounted) setUserProfile(profile);
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
                  if (profile.id === user.uid && ['student', 'parent', 'admin'].includes(profile.role)) {
                    setUserProfile(profile);
                    dataService.syncUserFromFirebase(profile);
                  } else {
                    dataService.logout();
                    setUserProfile(null);
                  }
                } else if (isMounted) {
                  void firebaseSignOut(auth).catch(() => undefined);
                  dataService.logout();
                  setUserProfile(null);
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
          const currentLocalUser = dataService.getCurrentUser();
          if (currentLocalUser?.email === 'muratteknofest@gmail.com' && currentLocalUser.role === 'admin' && dataService.isAuthenticated()) {
            if (isMounted) setUserProfile(currentLocalUser);
            if (isMounted) setLoading(false);
            return;
          }
          dataService.logout();
          if (isMounted) setUserProfile(null);
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

    const validatedData = parseResult.data;

    // Update only fields accepted by the profile schema.
    if (userProfile) {
      const updated = { ...userProfile, ...validatedData, updatedAt: Date.now() };
      setUserProfile(updated);
      dataService.setCurrentUser(updated);
    }

    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const updatedData = { ...validatedData, updatedAt: Date.now() };
        await updateDoc(userDocRef, updatedData);
      } catch (error) {
        console.warn("Notice: Firestore profile update skipped:", error);
      }
    }
  };

  const sendEmailVerification = async (user: User) => {
    await firebaseSendEmailVerification(user);
  };

  const sendPasswordResetEmail = async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
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
