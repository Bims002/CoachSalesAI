import React, { useState } from 'react';
import { auth } from '../firebase-config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const AuthForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // La redirection ou la mise à jour de l'état de l'utilisateur sera gérée par AuthContext
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // La redirection ou la mise à jour de l'état de l'utilisateur sera gérée par AuthContext
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
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
          />
        </div>
        <div>
          <label htmlFor="password">Mot de passe:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', marginBottom: '15px' }}>
          {isLogin ? 'Se connecter' : 'S\'inscrire'}
        </button>
      </form>
      <button onClick={handleGoogleSignIn} style={{ width: '100%', backgroundColor: '#db4437', marginBottom: '15px' }}>
        Continuer avec Google
      </button>
      <button onClick={() => setIsLogin(!isLogin)} style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}>
        {isLogin ? 'Pas encore de compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  );
};

export default AuthForm;
