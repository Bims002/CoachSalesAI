import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react'; // Import de type pour ReactNode
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth'; // Import de type pour User
import { auth, db } from '../firebase-config'; // Importer db
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Importer les fonctions Firestore

// Définir une interface pour le profil utilisateur stocké dans Firestore
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'commercial' | 'manager' | 'admin'; // Définir les rôles possibles
  teamId?: string; // Optionnel, pour lier à une équipe
  managerId?: string; // Optionnel, pour lier un commercial à un manager
  // Ajoutez d'autres champs de profil si nécessaire
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null; // Ajouter le profil utilisateur
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Utilisateur connecté, récupérer ou créer son profil Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Créer un profil par défaut si inexistant (ex: premier login)
            const newUserProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role: 'commercial', // Rôle par défaut
              // teamId et managerId peuvent être définis plus tard par un admin/manager
            };
            await setDoc(userRef, newUserProfile);
            setUserProfile(newUserProfile);
            console.log("Nouveau profil utilisateur créé dans Firestore:", newUserProfile);
          }
        } catch (error) {
            console.error("Erreur lors de la récupération/création du profil utilisateur Firestore:", error);
            setUserProfile(null); // S'assurer que le profil est null en cas d'erreur
        }
      } else {
        // Utilisateur déconnecté
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe; // Se désabonner au démontage
  }, []);

  const value = {
    currentUser,
    userProfile, // Exposer le profil
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
