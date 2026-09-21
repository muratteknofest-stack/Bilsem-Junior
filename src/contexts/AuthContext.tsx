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
import { safeStorage } from '../lib/storage';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  loginLocally: (profile: UserProfile) => Promise<void>;
  sendEmailVerification: (user: User) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
  updateProfile: async () => {},
  loginLocally: async () => {},
  sendEmailVerification: async () => {},
  sendPasswordResetEmail: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const SUPPORTED_ROLES: UserRole[] = ['student', 'parent', 'admin'];

async function assertAuthorizedProfile(user: User, profile: UserProfile): Promise<void> {
  if (profile.id !== user.uid || !SUPPORTED_ROLES.includes(profile.role)) {
    throw new Error('INVALID_PROFILE');
  }

  if (profile.role === 'admin') {
    const token = await user.getIdTokenResult();
    if (token.claims.role !== 'admin') {
      throw new Error('ADMIN_CLAIM_REQUIRED');
    }
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (dataService.isAuthenticated()) {
      return dataService.getCurrentUser();
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const loginLocally = async (profile: UserProfile) => {
    const user = auth.currentUser;
    if (!user) throw new Error('AUTH_REQUIRED');
    await assertAuthorizedProfile(user, profile);
    dataService.loginAs(profile.role, profile);
    setUserProfile(profile);
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
            // Accounts without an application profile are never provisioned by
            // the browser. Administrative authority must also be present in the
            // signed Firebase token, never inferred from an email or profile field.
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
              throw new Error('PROFILE_NOT_FOUND');
            }

            const profile = docSnap.data() as UserProfile;
            await assertAuthorizedProfile(user, profile);
            if (profile.role !== 'admin') {
              // Remove answer-bearing question-bank caches created by legacy
              // releases before student delivery moved to the challenge API.
              safeStorage.removeItem('bilsem_admin_managed_questions_v2');
            }
            dataService.loginAs(profile.role, profile);
            await dataService.hydrateUserStateFromFirebase();
            if (isMounted) setUserProfile(profile);
          } catch (err) {
            console.warn('Authenticated profile could not be authorized:', err);
            await firebaseSignOut(auth).catch(() => undefined);
            dataService.logout();
            if (isMounted) setUserProfile(null);
            if (isMounted) setLoading(false);
            return;
          }

          try {
            unsubSnap = onSnapshot(
              userDocRef,
              async (snap) => {
                if (snap.exists() && isMounted) {
                  const profile = snap.data() as UserProfile;
                  try {
                    await assertAuthorizedProfile(user, profile);
                    setUserProfile(profile);
                    dataService.syncUserFromFirebase(profile);
                  } catch (profileError) {
                    console.warn('Profile authorization changed; ending session:', profileError);
                    await firebaseSignOut(auth).catch(() => undefined);
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
          dataService.logout();
          if (isMounted) setUserProfile(null);
          if (isMounted) setLoading(false);
        }
      },
      (authError) => {
        // Authentication uncertainty fails closed. Firebase normally restores a
        // cached signed-in user through the success callback when offline.
        console.warn('Firebase Auth network state notice (handled):', authError.message || authError);
        dataService.logout();
        if (isMounted) setCurrentUser(null);
        if (isMounted) setUserProfile(null);
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
