
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('AuthProvider: Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('AuthProvider: Starting Google sign-in');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('AuthProvider: Google sign-in successful:', result.user.email);
    } catch (error) {
      console.error('AuthProvider: Error signing in with Google:', error);
    }
  };

  const logout = async () => {
    try {
      console.log('AuthProvider: Signing out');
      await signOut(auth);
      console.log('AuthProvider: Sign out successful');
    } catch (error) {
      console.error('AuthProvider: Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    logout,
  };

  console.log('AuthProvider: Rendering with state:', { hasUser: !!user, loading });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
