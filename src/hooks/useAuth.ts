import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, logout as firebaseLogout } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timeout to prevent infinite loading if Firebase hangs
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    if (!auth) {
      setLoading(false);
      clearTimeout(timeout);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const targetEmail = 'eletricistaarthur@gmail.com';
      if (currentUser && currentUser.email && currentUser.email.toLowerCase() !== targetEmail.toLowerCase()) {
        console.warn('Unauthorized user detected, logging out:', currentUser.email);
        await firebaseLogout();
        setUser(null);
      } else {
        setUser(currentUser);
      }
      setLoading(false);
      clearTimeout(timeout);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return { user, loading, logout };
}
