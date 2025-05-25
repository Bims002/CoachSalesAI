import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase-config';
import { signOut } from 'firebase/auth';

interface NavbarProps {
  onNavigate: (step: 'scenarioSelection' | 'history' | 'dashboard' | 'auth') => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsMobileMenuOpen(false); // Fermer le menu après déconnexion
      onNavigate('auth'); 
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleResize = () => {
    setIsMobileView(window.innerWidth < 768);
    if (window.innerWidth >= 768) {
      setIsMobileMenuOpen(false); // Fermer le menu si on passe en vue desktop
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navLinkStyle: React.CSSProperties = {
    marginRight: '15px',
    fontSize: '1rem',
    padding: '8px 12px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    border: 'none'
  };
  
  const mobileNavLinkStyle: React.CSSProperties = {
    ...navLinkStyle,
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '15px 20px',
    marginRight: 0,
    borderBottom: '1px solid var(--color-border)'
  };

  const renderNavLinks = (isMobile: boolean) => (
    <>
      {currentUser ? (
        <>
          <button onClick={() => { onNavigate('dashboard'); setIsMobileMenuOpen(false); }} style={isMobile ? mobileNavLinkStyle : navLinkStyle}>📊 Tableau de Bord</button>
          <button onClick={() => { onNavigate('history'); setIsMobileMenuOpen(false); }} style={isMobile ? mobileNavLinkStyle : navLinkStyle}>🕒 Historique</button>
          <button onClick={handleSignOut} style={isMobile ? {...mobileNavLinkStyle, backgroundColor: 'var(--color-text-secondary)', color: 'var(--color-bg)'} : {...navLinkStyle, backgroundColor: 'var(--color-text-secondary)', color: 'var(--color-bg)'} }>↪️ Déconnexion</button>
        </>
      ) : (
        <button onClick={() => { onNavigate('auth'); setIsMobileMenuOpen(false); }} style={isMobile ? mobileNavLinkStyle : navLinkStyle}>👤 Connexion / Inscription</button>
      )}
    </>
  );

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-primary)',
      fontWeight: 'bold',
      fontSize: '1.5rem',
      borderBottom: '1px solid var(--color-border)',
      marginBottom: '20px',
      position: 'relative' // Pour le positionnement du menu mobile
    }}>
      <div style={{ cursor: 'pointer' }} onClick={() => { onNavigate(currentUser ? 'scenarioSelection' : 'auth'); setIsMobileMenuOpen(false); }}>CoachSales AI</div>
      
      {isMobileView ? (
        <button 
          onClick={toggleMobileMenu} 
          style={{ 
            fontSize: '1.5rem', // Maintenir la taille de l'icône
            background: 'none', 
            border: 'none', 
            color: 'var(--color-text-primary)', 
            cursor: 'pointer',
            padding: '0.25rem 0.5rem', // Réduire le padding pour réduire la taille globale du bouton
            lineHeight: '1' // Assurer que la hauteur de ligne n'ajoute pas d'espace excessif
          }}
          aria-label="Toggle menu" // Pour l'accessibilité
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {renderNavLinks(false)}
        </div>
      )}

      {isMobileView && isMobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '100%', // Se positionne juste en dessous de la navbar
          left: 0,
          right: 0,
          backgroundColor: 'var(--color-bg-secondary)',
          zIndex: 1000,
          borderTop: '1px solid var(--color-border)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        }}>
          {renderNavLinks(true)}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
