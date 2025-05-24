import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase-config';
import { signOut } from 'firebase/auth';

interface NavbarProps {
  onNavigate: (step: 'scenarioSelection' | 'history' | 'dashboard' | 'auth') => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onNavigate('auth'); // Rediriger vers la page d'authentification après déconnexion
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      backgroundColor: 'var(--color-bg)', // Utiliser les variables CSS
      color: 'var(--color-text-primary)',
      fontWeight: 'bold',
      fontSize: '1.5rem',
      borderBottom: '1px solid var(--color-border)', // Style GitHub
      marginBottom: '20px'
    }}>
      <div style={{ cursor: 'pointer' }} onClick={() => onNavigate(currentUser ? 'scenarioSelection' : 'auth')}>CoachSales AI</div>
      <div>
        {currentUser ? (
          <>
            <button onClick={() => onNavigate('dashboard')} style={{ marginRight: '10px', fontSize: '1rem', padding: '8px 12px' }}>Tableau de Bord</button>
            <button onClick={() => onNavigate('history')} style={{ marginRight: '10px', fontSize: '1rem', padding: '8px 12px' }}>Historique</button>
            <button onClick={handleSignOut} style={{ fontSize: '1rem', padding: '8px 12px', backgroundColor: 'var(--color-text-secondary)' }}>Déconnexion</button>
          </>
        ) : (
          <button onClick={() => onNavigate('auth')} style={{ fontSize: '1rem', padding: '8px 12px' }}>Connexion / Inscription</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
