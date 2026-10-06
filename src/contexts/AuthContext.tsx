import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as supabaseSignOut,
  sendEmailVerification as supabaseSendEmailVerification,
  sendPasswordResetEmail as supabaseSendPasswordResetEmail
} from '../lib/supabase';
import { doc, getDoc, updateDoc, onSnapshot } from '../lib/supabase-data';
import { auth, db } from '../lib/platform';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/data-service';
import { userProfileUpdateSchema, formatZodError } from '../lib/validations';
import { isManagedStudentEmail } from '../lib/account-identifiers';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdminAuthorized: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  loginLocally: (profile: UserProfile) => void;
  switchRole: (role: UserRole) => void;
  sendEmailVerification: (user: User) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  isAdminAuthorized: false,
  loading: true,
  logout: async () => {},
  updateProfile: async () => {},
  loginLocally: () => {},
  switchRole: () => {},
  sendEmailVerification: async () => {},
  sendPasswordResetEmail: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const loginLocally = (profile: UserProfile) => {
    setUserProfile(profile);
    dataService.setCurrentUser(profile);
  };

  const switchRole = (role: UserRole) => {
    if (!userProfile) return;
    if (!userProfile.id.startsWith('demo_') && role !== userProfile.role) return;
    if (role === 'admin' && (!isAdminAuthorized || userProfile.role !== 'admin')) return;
    if (role === 'admin' && !isAdminAuthorized) return;
    const updated = { ...userProfile, role };
    setUserProfile(updated);
    dataService.switchRole(role);
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
        setIsAdminAuthorized(false);
        if (user) {
          if (!isManagedStudentEmail(user.email) && !user.emailVerified) {
            await supabaseSignOut(auth).catch(() => undefined);
            dataService.logout();
            if (isMounted) setUserProfile(null);
            if (isMounted) setLoading(false);
            return;
          }
          // Validate the profile in Supabase before exposing an authenticated session.
          const userDocRef = doc(db, 'users', user.uid);
          let adminAuthorized = false;
          
          try {
            // Accounts without an application profile are not silently provisioned.
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
              await supabaseSignOut(auth).catch(() => undefined);
              dataService.logout();
              if (isMounted) setUserProfile(null);
              if (isMounted) setLoading(false);
              return;
            } else {
              const profile = docSnap.data() as UserProfile;
              if (profile.id !== user.uid || !['student', 'parent', 'admin'].includes(profile.role)) {
                await supabaseSignOut(auth).catch(() => undefined);
                dataService.logout();
                if (isMounted) setUserProfile(null);
                if (isMounted) setLoading(false);
                return;
              }
              if (profile.role === 'admin') {
                const token = await user.getIdTokenResult(true);
                adminAuthorized = user.emailVerified && token.claims.role === 'admin';
                if (!adminAuthorized) {
                  await supabaseSignOut(auth).catch(() => undefined);
                  dataService.logout();
                  if (isMounted) setUserProfile(null);
                  if (isMounted) setLoading(false);
                  return;
                }
              }
              const localUser = dataService.getCurrentUser();
              const activeRole = profile.role;
              const activeProfile: UserProfile = { ...profile, role: activeRole };
              dataService.loginAs(activeRole, activeProfile);
              await dataService.hydrateUserStateFromSupabase();
              if (isMounted) {
                setUserProfile(activeProfile);
                setIsAdminAuthorized(adminAuthorized);
              }
            }
          } catch (err) {
            console.warn('Supabase profili yüklenemedi:', err);
            await supabaseSignOut(auth).catch(() => undefined);
            dataService.logout();
            if (isMounted) setUserProfile(null);
            if (isMounted) setIsAdminAuthorized(false);
            if (isMounted) setLoading(false);
            return;
          }

          try {
            unsubSnap = onSnapshot(
              userDocRef,
              (snap) => {
                if (snap.exists() && isMounted) {
                  const profile = snap.data() as UserProfile;
                  if (profile.id === user.uid && ['student', 'parent', 'admin'].includes(profile.role) &&
                      (profile.role !== 'admin' || adminAuthorized)) {
                    const localUser = dataService.getCurrentUser();
                    const activeRole = profile.role;
                    const activeProfile: UserProfile = { ...profile, role: activeRole };
                    setUserProfile(activeProfile);
                    setIsAdminAuthorized(profile.role === 'admin' && adminAuthorized);
                    dataService.syncUserFromSupabase(activeProfile);
                  } else {
                    void supabaseSignOut(auth).catch(() => undefined);
                    dataService.logout();
                    setUserProfile(null);
                    setIsAdminAuthorized(false);
                  }
                } else if (isMounted) {
                  void supabaseSignOut(auth).catch(() => undefined);
                  dataService.logout();
                  setUserProfile(null);
                  setIsAdminAuthorized(false);
                }
              },
              (snapErr) => {
                console.warn('Supabase profil senkronizasyonu başarısız:', snapErr);
              }
            );
          } catch {}
          
          updateDoc(userDocRef, { lastLoginAt: Date.now() }).catch(() => {});
          if (isMounted) setLoading(false);
        } else {
          dataService.logout();
          if (isMounted) setUserProfile(null);
          if (isMounted) setIsAdminAuthorized(false);
          if (isMounted) setLoading(false);
        }
      },
      (authError) => {
        console.warn('Supabase Auth bağlantı hatası:', authError.message || authError);
        dataService.logout();
        if (isMounted) {
          setCurrentUser(null);
          setUserProfile(null);
          setIsAdminAuthorized(false);
          setLoading(false);
        }
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
      await supabaseSignOut(auth);
    } catch (e) {
      console.warn('Supabase oturumu kapatılamadı:', e);
    }
    dataService.logout();
    setCurrentUser(null);
    setUserProfile(null);
    setIsAdminAuthorized(false);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    // Validate with Zod schema before sending updates
    const parseResult = userProfileUpdateSchema.safeParse(data);
    if (!parseResult.success) {
      const { firstMessage } = formatZodError(parseResult.error);
      throw new Error(firstMessage);
    }

    const validatedData = parseResult.data;

    const updatedAt = Date.now();
    if (userProfile?.id.startsWith('demo_')) {
      const updated = { ...userProfile, ...validatedData, updatedAt };
      setUserProfile(updated);
      dataService.setCurrentUser(updated);
      return;
    }
    if (!currentUser || !userProfile) throw new Error('Profil güncellemek için oturum açın.');
    await updateDoc(doc(db, 'users', currentUser.uid), { ...validatedData, updatedAt });
    const updated = { ...userProfile, ...validatedData, updatedAt };
    setUserProfile(updated);
    dataService.syncUserFromSupabase(updated);
  };

  const sendEmailVerification = async (user: User) => {
    await supabaseSendEmailVerification(user);
  };

  const sendPasswordResetEmail = async (email: string) => {
    await supabaseSendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      userProfile, 
      isAdminAuthorized,
      loading, 
      logout, 
      updateProfile,
      loginLocally,
      switchRole,
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
