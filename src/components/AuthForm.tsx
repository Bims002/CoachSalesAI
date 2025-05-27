import React, { useState } from 'react';
import { auth } from '../firebase-config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import type { UserCredential } from 'firebase/auth'; // Importer UserCredential en tant que type
import { doc, setDoc } from 'firebase/firestore'; // Importer pour Firestore
import { db } from '../firebase-config'; // Importer db
import type { UserProfile } from '../contexts/AuthContext'; // Importer UserProfile

interface AuthFormProps {
  onNavigateToGuest?: () => void; 
}

type UserRole = 'commercial' | 'manager'; // Simplifié pour l'inscription, 'admin' serait géré autrement

const AuthForm: React.FC<AuthFormProps> = ({ onNavigateToGuest }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('commercial'); // Nouvel état pour le rôle
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Après la création de l'utilisateur Firebase Auth, créer le profil Firestore
        if (userCredential.user) {
          const userRef = doc(db, 'users', userCredential.user.uid);
          const newUserProfile: Omit<UserProfile, 'uid'> & { uid?: string } = { // uid est dans userCredential.user.uid
            email: userCredential.user.email,
            displayName: userCredential.user.displayName, // Peut être null, ou demander un nom d'utilisateur
            role: selectedRole,
            // teamId et managerId peuvent être définis plus tard par un admin/manager
          };
          await setDoc(userRef, { uid: userCredential.user.uid, ...newUserProfile });
          console.log("Profil Firestore créé depuis AuthForm avec rôle:", selectedRole);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Cette adresse e-mail est déjà utilisée. Essayez de vous connecter ou utilisez une autre adresse.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("Email ou mot de passe incorrect.");
      }
      else {
        setError(err.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Veuillez entrer votre adresse e-mail pour réinitialiser le mot de passe.");
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Un e-mail de réinitialisation du mot de passe a été envoyé à votre adresse.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-form-container app-section">
      <h2>{isLogin ? 'Connexion' : 'Inscription'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
          />
        </div>
        {isLogin && (
          <div>
           <label htmlFor="password">Mot de passe:</label>
           <input
             type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
            />
            <button type="button" onClick={handlePasswordReset} style={{ fontSize: '0.9rem', padding: '6px 10px', backgroundColor: 'transparent', color: 'var(--color-accent)', border: 'none', textDecoration: 'underline', cursor: 'pointer', display: 'block', textAlign: 'right', marginBottom: '15px' }}>
              Mot de passe oublié ?
            </button>
          </div>
        )}
        {!isLogin && (
           <div>
           <label htmlFor="password">Mot de passe:</label>
           <input
             type="password"
             id="password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             required
             style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
           />
           {/* Sélecteur de rôle pour l'inscription */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Je suis un :</label>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="role" 
                    value="commercial" 
                    checked={selectedRole === 'commercial'} 
                    onChange={() => setSelectedRole('commercial')} 
                    style={{ marginRight: '5px' }}
                  />
                  Commercial
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="role" 
                    value="manager" 
                    checked={selectedRole === 'manager'} 
                    onChange={() => setSelectedRole('manager')} 
                    style={{ marginRight: '5px' }}
                  />
                  Manager
                </label>
              </div>
            </div>
         </div>
        )}
        {error && <p style={{ color: '#dc3545', marginBottom: '10px', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}
        {message && <p style={{ color: '#28a745', marginBottom: '10px', textAlign: 'center', fontSize: '0.9rem' }}>{message}</p>}
        <button type="submit" style={{ width: '100%', marginBottom: '10px', padding: '12px 20px', fontSize: '1rem' }}>
          {isLogin ? 'Se connecter' : 'S\'inscrire'}
        </button>
      </form>
      <button onClick={handleGoogleSignIn} style={{ width: '100%', backgroundColor: '#4285F4', color: 'white', marginBottom: '10px', padding: '12px 20px', fontSize: '1rem' }}>
        Continuer avec Google
      </button>
      <button 
        onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }} 
        style={{ 
          width: '100%', 
          backgroundColor: 'transparent', 
          color: 'var(--color-accent)', 
          border: `1px solid var(--color-accent)`, 
          marginBottom: '10px', 
          padding: '12px 20px', 
          fontSize: '1rem' 
        }}
      >
        {isLogin ? 'Pas encore de compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
      </button>
      
      {onNavigateToGuest && (
        <button 
          onClick={onNavigateToGuest} // Appel direct de la fonction fournie par App.tsx
          style={{ 
            width: '100%', 
            backgroundColor: 'transparent', 
            color: 'var(--color-text-secondary)', 
            border: `1px solid var(--color-text-secondary)`,
            marginTop: '10px', // Garder un peu d'espace en haut
            padding: '12px 20px',
            fontSize: '1rem'
          }}
        >
          Continuer en tant qu'invité
        </button>
      )}
    </div>
  );
};

export default AuthForm;
