
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';

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

  // Store user info in Firestore
  const storeUserInFirestore = async (user: User) => {
    try {
      console.log('AuthProvider: Storing user in Firestore:', user.email);
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
      console.log('AuthProvider: User stored successfully in Firestore');
    } catch (error) {
      console.error('AuthProvider: Error storing user in Firestore:', error);
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthProvider: Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setUser(user);
      
      if (user) {
        // Store user info in Firestore whenever they authenticate
        await storeUserInFirestore(user);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('AuthProvider: Starting Google sign-in');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('AuthProvider: Google sign-in successful:', result.user.email);
      
      // Store user info in Firestore immediately after sign-in
      await storeUserInFirestore(result.user);
    } catch (error) {
      console.error('AuthProvider: Error signing in with Google:', error);
      throw error;
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
