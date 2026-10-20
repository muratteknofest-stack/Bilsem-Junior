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
import { cancelAccountSwitch } from '../lib/account-switch';
import { observeSession, type SessionStartupState } from '../features/auth/session-startup';
import { AuthStartupView } from '../features/auth/components/AuthStartupView';
import { markProgressReadUnavailable } from '../services/modules/persistence-service';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdminAuthorized: boolean;
  loading: boolean;
  startupError: string | null;
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
  startupError: null,
  logout: async () => {},
  updateProfile: async () => {},
  loginLocally: () => {},
  switchRole: () => {},
  sendEmailVerification: async () => {},
  sendPasswordResetEmail: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  publicEntry?: React.ReactNode;
  publicLanding?: boolean;
}> = ({ children, publicEntry, publicLanding = false }) => {
  const [session, setSession] = useState<SessionStartupState>({
    currentUser: null, userProfile: null, isAdminAuthorized: false, loading: true, startupError: null,
  });
  const { currentUser, userProfile, isAdminAuthorized, loading, startupError } = session;
  const setUserProfile = (profile: UserProfile | null) => setSession(previous => ({ ...previous, userProfile: profile }));

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

  useEffect(() => observeSession({
    currentUserId: () => auth.currentUser?.uid ?? null,
    subscribe: (receive, fail) => onAuthStateChanged(auth, receive, fail),
    canUseAccount: user => isManagedStudentEmail(user.email) || user.emailVerified,
    loadProfile: async user => {
      const snapshot = await getDoc(doc(db, 'users', user.uid));
      return snapshot.exists() ? snapshot.data() as UserProfile : null;
    },
    authorizeAdmin: async user => {
      // Never refresh inside every Auth event: it emits another Auth event.
      const token = await user.getIdTokenResult();
      return user.emailVerified && token.claims.role === 'admin';
    },
    activate: profile => { dataService.loginAs(profile.role, profile); },
    syncProfile: profile => { dataService.syncUserFromSupabase(profile); },
    hydrate: signal => dataService.hydrateUserStateFromSupabase({ signal }),
    progressUnavailable: markProgressReadUnavailable,
    clearSession: () => { cancelAccountSwitch(); dataService.logout(); },
    signOut: () => supabaseSignOut(auth),
    watch: (user, next, fail) => {
      const ref = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(ref, snapshot => next(snapshot.exists() ? snapshot.data() as UserProfile : null), fail);
      void updateDoc(ref, { lastLoginAt: Date.now() }).catch(() => undefined);
      return unsubscribe;
    },
    onState: setSession,
    notice: error => { console.warn('Oturum bağlantısı:', error); },
  }), []);

  const logout = async () => {
    cancelAccountSwitch();
    await supabaseSignOut(auth);
    dataService.logout();
    setSession({ currentUser: null, userProfile: null, isAdminAuthorized: false, loading: false, startupError: null });
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
      startupError,
      logout, 
      updateProfile,
      loginLocally,
      switchRole,
      sendEmailVerification,
      sendPasswordResetEmail
    }}>
      {publicEntry ?? ((loading || startupError || (publicLanding && !userProfile))
        ? <AuthStartupView error={startupError} publicLanding={publicLanding} />
        : children)}
    </AuthContext.Provider>
  );
};

