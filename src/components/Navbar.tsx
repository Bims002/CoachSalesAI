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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsMobileMenuOpen(false);
      onNavigate('auth'); 
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const handleNavLinkClick = (step: 'scenarioSelection' | 'history' | 'dashboard' | 'auth') => {
    onNavigate(step);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false); 
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navLinkBaseStyle: React.CSSProperties = {
    padding: '10px 15px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    border: 'none',
    textAlign: 'left',
    width: '100%',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
  };
  
  const navLinkMobileStyle: React.CSSProperties = {
    ...navLinkBaseStyle,
    borderBottom: '1px solid var(--color-border)',
  };
  
  const iconStyle: React.CSSProperties = {
    marginRight: '8px',
    fontSize: '1.2em',
  };

  const renderNavLinks = (isMobileLayout: boolean) => { // Renommé pour clarifier que c'est pour le layout mobile du menu
    const styleToUse = isMobileLayout ? navLinkMobileStyle : navLinkBaseStyle; // Utiliser navLinkBaseStyle pour desktop (sera dans la sidebar)
    return (
      <>
        {currentUser ? (
          <>
            <button onClick={() => handleNavLinkClick('dashboard')} style={styleToUse}><span style={iconStyle}>📊</span>Tableau de Bord</button>
            <button onClick={() => handleNavLinkClick('history')} style={styleToUse}><span style={iconStyle}>🕒</span>Historique</button>
            <button onClick={handleSignOut} style={{...styleToUse, ...(isMobileLayout && {backgroundColor: 'var(--color-text-secondary)', color: 'var(--color-bg)'}) }}><span style={iconStyle}>↪️</span>Déconnexion</button>
          </>
        ) : (
          <button onClick={() => handleNavLinkClick('auth')} style={styleToUse}><span style={iconStyle}>👤</span>Connexion / Inscription</button>
        )}
      </>
    );
  };

  return (
    <>
      {/* Sidebar pour desktop (sera cachée sur mobile par CSS) */}
      <nav className="sidebar"> {/* Appliquer la classe .sidebar définie dans App.css */}
        <div 
          style={{ 
            marginBottom: '30px', 
            fontSize: '1.8rem', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            cursor: 'pointer',
            padding: '10px 0', // Ajouter un peu de padding
            borderBottom: `1px solid var(--color-border)` // Séparateur
          }} 
          onClick={() => handleNavLinkClick(currentUser ? 'scenarioSelection' : 'auth')}
        >
          CoachSales AI
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {renderNavLinks(true)} {/* Liens verticaux dans la sidebar */}
        </div>
      </nav>

      {/* Navbar pour mobile en haut, avec menu hamburger (sera cachée sur desktop par CSS) */}
      <nav className="mobile-navbar">
        <div style={{ cursor: 'pointer' }} onClick={() => handleNavLinkClick(currentUser ? 'scenarioSelection' : 'auth')}>CoachSales AI</div>
        <button 
          onClick={toggleMobileMenu} 
          className="hamburger-button"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Menu déroulant pour mobile */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-dropdown">
          {renderNavLinks(true)}
        </div>
      )}
    </>
  );
};

export default Navbar;
