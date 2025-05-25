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
    padding: '12px 20px', // Augmenter le padding pour plus d'espace
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    border: 'none', // Retirer les bordures de bouton
    textAlign: 'left',
    width: '100%',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '6px', // Coins arrondis pour l'effet de survol
    transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
    marginBottom: '8px', // Ajouter un espace entre les liens
  };
  
  // Style pour le survol des liens
  const navLinkHoverStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-accent)',
    color: 'white', // Ou var(--color-bg) pour un contraste différent
  };

  // Pas besoin de navLinkMobileStyle distinct si on utilise la même base pour la sidebar et le dropdown
  
  const iconStyle: React.CSSProperties = {
    marginRight: '12px', // Plus d'espace pour l'icône
    fontSize: '1.3em', // Icônes légèrement plus grandes
    minWidth: '20px', // Assurer un alignement si les icônes ont des largeurs différentes
    textAlign: 'center',
  };

  // Fonction pour créer un lien stylisé (div cliquable au lieu de bouton)
  const createNavLink = (
    text: string, 
    icon: string, 
    action: () => void, 
    isLogout?: boolean // Pour un style potentiellement différent pour la déconnexion
  ) => {
    const [isHovered, setIsHovered] = useState(false);
    const currentStyle = isHovered ? {...navLinkBaseStyle, ...navLinkHoverStyle} : navLinkBaseStyle;
    const logoutStyle = isLogout ? { color: '#ff7b72' } : {}; // Style optionnel pour déconnexion

    return (
      <div 
        onClick={action} 
        style={{...currentStyle, ...logoutStyle}}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button" // Pour l'accessibilité
        tabIndex={0} // Pour la navigation au clavier
        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') action(); }} // Accessibilité clavier
      >
        <span style={iconStyle}>{icon}</span>{text}
      </div>
    );
  };


  const renderNavLinks = () => { // isMobileLayout n'est plus nécessaire ici si le style est géré par le conteneur
    return (
      <>
        {currentUser ? (
          <>
            {createNavLink('Tableau de Bord', '📊', () => handleNavLinkClick('dashboard'))}
            {createNavLink('Historique', '🕒', () => handleNavLinkClick('history'))}
            {createNavLink('Déconnexion', '↪️', handleSignOut, true)}
          </>
        ) : (
          createNavLink('Connexion / Inscription', '👤', () => handleNavLinkClick('auth'))
        )}
      </>
    );
  };

  return (
    <>
      {/* Sidebar pour desktop (sera cachée sur mobile par CSS) */}
      <nav className="sidebar"> 
        <div 
          style={{ 
            marginBottom: '20px', // Réduire un peu la marge
            fontSize: '1.6rem', // Ajuster la taille du titre
            fontWeight: 'bold', 
            textAlign: 'center', 
            cursor: 'pointer',
            padding: '15px 0', 
            borderBottom: `1px solid var(--color-border)`,
            color: 'var(--color-text-primary)' // Assurer la couleur du texte
          }} 
          onClick={() => handleNavLinkClick(currentUser ? 'scenarioSelection' : 'auth')}
        >
          CoachSales AI
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {renderNavLinks()}
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
          {renderNavLinks()}
        </div>
      )}
    </>
  );
};

export default Navbar;
