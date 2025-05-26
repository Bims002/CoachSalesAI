import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase-config';
import { signOut } from 'firebase/auth';

// AppStep devrait idéalement être importé d'un fichier de types partagé ou de App.tsx
type AppStep = 'scenarioSelection' | 'contextInput' | 'simulation' | 'results' | 'history' | 'dashboard' | 'auth';

interface NavbarProps {
  onNavigate: (step: AppStep) => void;
  currentStep: AppStep; 
}

// Nouveau composant pour les liens de navigation
interface NavLinkComponentProps {
  text: string;
  icon: string;
  action: () => void;
  isActive: boolean;
  isLogout?: boolean;
}

const NavLinkComponent: React.FC<NavLinkComponentProps> = ({ text, icon, action, isActive, isLogout }) => {
  const [isHovered, setIsHovered] = useState(false);

  const navLinkBaseStyleInternal: React.CSSProperties = {
    padding: '12px 20px', 
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    border: 'none', 
    textAlign: 'left',
    width: '100%', 
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '6px', 
    transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
    marginBottom: '8px', 
    boxSizing: 'border-box', 
  };
  
  const navLinkHoverStyleInternal: React.CSSProperties = {
    backgroundColor: 'var(--color-accent)',
    color: 'white', 
  };

  const iconStyleInternal: React.CSSProperties = {
    marginRight: '12px', 
    fontSize: '1.3em', 
    minWidth: '20px', 
    textAlign: 'center',
    lineHeight: '1',
  };
  
  let currentStyle = { ...navLinkBaseStyleInternal };
  if (isActive) {
    currentStyle = { ...currentStyle, ...navLinkHoverStyleInternal }; 
  } else if (isHovered) {
    currentStyle = { ...currentStyle, ...navLinkHoverStyleInternal };
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
      <span style={iconStyleInternal}>{icon}</span>{text}
    </div>
  );
};


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
  
  const handleNavLinkClick = (step: AppStep) => { // Changé pour accepter AppStep
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

  const renderNavLinks = () => { 
    return (
      <>
        {!(currentStep === 'auth' && !currentUser) && 
          <NavLinkComponent 
            text="Nouvelle Simulation" 
            icon="✨" 
            action={() => handleNavLinkClick('scenarioSelection')} 
            isActive={currentStep === 'scenarioSelection' || currentStep === 'contextInput' || currentStep === 'simulation'} 
          />
        }

        {currentUser ? (
          <>
            <NavLinkComponent text="Tableau de Bord" icon="📊" action={() => handleNavLinkClick('dashboard')} isActive={currentStep === 'dashboard'} />
            <NavLinkComponent text="Historique" icon="🕒" action={() => handleNavLinkClick('history')} isActive={currentStep === 'history'} />
            <NavLinkComponent text="Déconnexion" icon="↪️" action={handleSignOut} isActive={false} isLogout={true} /> 
          </>
        ) : (
          currentStep !== 'auth' && <NavLinkComponent text="Connexion / Inscription" icon="👤" action={() => handleNavLinkClick('auth')} isActive={false} />
        )}
      </>
    );
  };

  return (
    <>
      <nav className="sidebar"> 
        <div 
          style={{ 
            marginBottom: '20px', 
            fontSize: '1.6rem', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            cursor: 'pointer',
            padding: '15px 0', 
            borderBottom: `1px solid var(--color-border)`,
            color: 'var(--color-text-primary)' 
          }} 
          onClick={() => handleNavLinkClick(currentUser ? 'scenarioSelection' : 'auth')}
        >
          CoachSales AI
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {renderNavLinks()}
        </div>
        <div style={{ 
          marginTop: 'auto', 
          paddingTop: '20px', 
          borderTop: `1px solid var(--color-border)`, 
          textAlign: 'center', 
          fontSize: '0.85rem', 
          color: 'var(--color-text-secondary)' 
        }}>
          &copy; {new Date().getFullYear()} CoachSales AI
        </div>
      </nav>

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

      {isMobileMenuOpen && (
        <div className="mobile-menu-dropdown">
          {renderNavLinks()}
        </div>
      )}
    </>
  );
};

export default Navbar;
