import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface CompanyProfile {
  name: string;
  details: string;
  pixKey: string;
  logo?: string;
  userId?: string;
}

export function useCompanyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile>({ name: '', details: '', pixKey: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!user || !db) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'company_profiles', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as CompanyProfile);
        } else {
          // Check local storage for legacy data and migrate
          const saved = localStorage.getItem('company_profile');
          if (saved) {
            const localData = JSON.parse(saved);
            const initialProfile = { ...localData, userId: user.uid };
            await setDoc(docRef, initialProfile);
            setProfile(initialProfile);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const saveProfile = async (newProfile: CompanyProfile) => {
    if (!user || !db) return;

    try {
      const docRef = doc(db, 'company_profiles', user.uid);
      const profileToSave = { ...newProfile, userId: user.uid };
      await setDoc(docRef, profileToSave);
      setProfile(profileToSave);
      // Also keep local storage for fallback/speed? Maybe not needed if we have firestore
      localStorage.setItem('company_profile', JSON.stringify(profileToSave));
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  };

  return { profile, saveProfile, loading };
}
