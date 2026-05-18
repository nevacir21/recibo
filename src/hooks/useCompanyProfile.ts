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

      // 1. Initial Load from Local Storage for instant UI response
      const cached = localStorage.getItem('company_profile');
      if (cached) {
        try {
          const localData = JSON.parse(cached);
          if (localData && localData.name) {
            setProfile(localData);
          }
        } catch (e) {
          console.error('Error parsing cached profile', e);
        }
      }

      // 2. Fetch from Firebase for the "source of truth"
      try {
        const docRef = doc(db, 'company_profiles', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const remoteData = docSnap.data() as CompanyProfile;
          setProfile(remoteData);
          localStorage.setItem('company_profile', JSON.stringify(remoteData));
        } else if (cached) {
          // If Firestore is empty but we have local data, migrate it to Firestore
          const localData = JSON.parse(cached);
          const profileToSync = { ...localData, userId: user.uid };
          if (profileToSync.name) {
            await setDoc(docRef, profileToSync);
            console.log('Migrated local profile to Firestore');
          }
        }
      } catch (error) {
        console.error('Error loading profile from Firestore:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const saveProfile = async (newProfile: CompanyProfile) => {
    if (!user || !db) {
      alert('Sistema não inicializado ou usuário não logado.');
      return;
    }

    try {
      const docRef = doc(db, 'company_profiles', user.uid);
      const profileToSave = { ...newProfile, userId: user.uid };
      
      console.log('Tentando salvar perfil:', profileToSave);
      
      await setDoc(docRef, profileToSave);
      setProfile(profileToSave);
      localStorage.setItem('company_profile', JSON.stringify(profileToSave));
    } catch (error: any) {
      console.error('Error saving profile:', error);
      if (error.message?.includes('Insufficient permissions')) {
        alert('Erro de permissão: Você não tem autorização para salvar o perfil da empresa. Verifique se seu login é válido.');
      } else {
        alert('Erro ao salvar dados da empresa: ' + (error.message || 'Erro desconhecido'));
      }
      throw error;
    }
  };

  return { profile, saveProfile, loading };
}
