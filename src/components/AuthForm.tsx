import React, { useState } from 'react';
import { auth } from '../firebase-config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';

const AuthForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // Pour les messages de succès (ex: email de réinitialisation envoyé)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // La redirection ou la mise à jour de l'état de l'utilisateur sera gérée par AuthContext
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
      // La redirection ou la mise à jour de l'état de l'utilisateur sera gérée par AuthContext
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
             style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
           />
         </div>
        )}
        {error && <p style={{ color: '#f44336', marginBottom: '15px', textAlign: 'center' }}>{error}</p>}
        {message && <p style={{ color: '#4caf50', marginBottom: '15px', textAlign: 'center' }}>{message}</p>}
        <button type="submit" style={{ width: '100%', marginBottom: '15px' }}>
          {isLogin ? 'Se connecter' : 'S\'inscrire'}
        </button>
      </form>
      <button onClick={handleGoogleSignIn} style={{ width: '100%', backgroundColor: '#4285F4', marginBottom: '15px' }}>
        Continuer avec Google
      </button>
      <button onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }} style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}>
        {isLogin ? 'Pas encore de compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  );
};

export default AuthForm;
