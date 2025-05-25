import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase-config';
import { signOut } from 'firebase/auth';

// Définir AppStep ici ou l'importer depuis App.tsx si partagé
type AppStep = 'scenarioSelection' | 'contextInput' | 'simulation' | 'results' | 'history' | 'dashboard' | 'auth';

interface NavbarProps {
  onNavigate: (step: AppStep) => void;
  currentStep: AppStep; // Ajouter currentStep aux props
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentStep }) => {
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
    padding: '12px 20px', 
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    border: 'none', 
    textAlign: 'left',
    width: '100%', // Important pour que le fond prenne toute la largeur
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '6px', 
    transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
    marginBottom: '8px', 
    boxSizing: 'border-box', // S'assurer que padding et border ne changent pas la taille calculée
  };
  
  const navLinkHoverStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-accent)',
    color: 'white', 
  };
  
  const iconStyle: React.CSSProperties = {
    marginRight: '12px', 
    fontSize: '1.3em', 
    minWidth: '20px', 
    textAlign: 'center',
    lineHeight: '1', // Empêcher l'icône d'affecter la hauteur de ligne
  };

  const createNavLink = (
    text: string, 
    icon: string, 
    action: () => void, 
    isActive: boolean, // Nouvelle prop pour l'état actif
    isLogout?: boolean 
  ) => {
    const [isHovered, setIsHovered] = useState(false);
    
    let currentStyle = { ...navLinkBaseStyle };
    if (isActive) {
      currentStyle = { ...currentStyle, ...navLinkHoverStyle }; // Appliquer le style hover si actif
    } else if (isHovered) {
      currentStyle = { ...currentStyle, ...navLinkHoverStyle };
    }

    const logoutStyle = isLogout ? { color: isActive || isHovered ? 'white' : '#ff7b72' } : {};

    return (
      <div 
        onClick={action} 
        style={{...currentStyle, ...logoutStyle}}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button" 
        tabIndex={0} 
        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') action(); }} 
      >
        <span style={iconStyle}>{icon}</span>{text}
      </div>
    );
  };

  // Déterminer l'étape active pour le style
  // Cela nécessite que `App.tsx` passe `currentStep` à `Navbar` ou que Navbar ait accès à cette info.
  // Pour l'instant, on va supposer que `onNavigate` est appelé avec l'étape actuelle,
  // mais pour un style "actif" persistant, il faudrait l'état `currentStep` ici.
  // Simplification: on ne gère que le survol pour l'instant, pas un état "actif" distinct visuellement après clic,
  // car cela nécessiterait de passer `currentStep` en prop.
  // La logique ci-dessus avec `isActive` est une préparation si on ajoute `currentStep`.

  const renderNavLinks = () => { 
    return (
      <>
        {/* Lien Nouvelle Simulation toujours visible en premier (sauf si sur la page auth et non connecté) */}
        {/* Si l'utilisateur n'est pas connecté et est sur la page 'auth', on ne montre que le lien d'auth */}
        {!(currentStep === 'auth' && !currentUser) && 
          createNavLink('Nouvelle Simulation', '✨', () => handleNavLinkClick('scenarioSelection'), currentStep === 'scenarioSelection' || currentStep === 'contextInput' || currentStep === 'simulation')
        }

        {currentUser ? (
          <>
            {createNavLink('Tableau de Bord', '📊', () => handleNavLinkClick('dashboard'), currentStep === 'dashboard')}
            {createNavLink('Historique', '🕒', () => handleNavLinkClick('history'), currentStep === 'history')}
            {createNavLink('Déconnexion', '↪️', handleSignOut, false, true)} 
          </>
        ) : (
          // Si non connecté, et pas déjà sur 'auth', afficher le lien de connexion.
          // Si sur 'auth', ce lien est déjà implicitement géré par le titre cliquable ou le flux.
          // Pour plus de clarté, on peut le remontrer ici si on n'est pas sur la page 'auth'.
          currentStep !== 'auth' && createNavLink('Connexion / Inscription', '👤', () => handleNavLinkClick('auth'), false)
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
