
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
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

  // Store user info in Firestore with all necessary details
  const storeUserInFirestore = async (user: User) => {
    try {
      console.log('AuthProvider: Storing user in Firestore:', user.email);
      const userDocRef = doc(db, 'users', user.uid);
      
      // Check if user document already exists
      const userDoc = await getDoc(userDocRef);
      const isNewUser = !userDoc.exists();
      
      const userData: any = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
        photoURL: user.photoURL,
        lastActive: serverTimestamp(),
        emailVerified: user.emailVerified,
        providerData: user.providerData.map(provider => ({
          providerId: provider.providerId,
          uid: provider.uid
        }))
      };

      if (isNewUser) {
        userData.createdAt = serverTimestamp();
        console.log('AuthProvider: Creating new user document for:', user.email);
      } else {
        console.log('AuthProvider: Updating existing user document for:', user.email);
      }

      await setDoc(userDocRef, userData, { merge: true });
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
      await storeUserInFirestore(result.user);
    } catch (error) {
      console.error('AuthProvider: Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('AuthProvider: Starting email sign-in');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('AuthProvider: Email sign-in successful:', result.user.email);
      await storeUserInFirestore(result.user);
    } catch (error) {
      console.error('AuthProvider: Error signing in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      console.log('AuthProvider: Starting email sign-up');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      console.log('AuthProvider: Email sign-up successful:', result.user.email);
      await storeUserInFirestore(result.user);
    } catch (error) {
      console.error('AuthProvider: Error signing up with email:', error);
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
    signInWithEmail,
    signUpWithEmail,
    logout,
  };

  console.log('AuthProvider: Rendering with state:', { hasUser: !!user, loading });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
