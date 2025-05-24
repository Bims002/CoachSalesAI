import React from 'react';

interface NavbarProps {
  onNavigate: (step: 'scenarioSelection' | 'history' | 'dashboard') => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      backgroundColor: '#1e88e5',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '1.5rem',
      boxShadow: '0 4px 12px rgba(30, 136, 229, 0.4)',
      borderRadius: '12px 12px 0 0',
      marginBottom: '20px'
    }}>
      <div>CoachSales AI</div>
      <div>
        <button onClick={() => onNavigate('scenarioSelection')} style={{ marginRight: '10px', fontSize: '1rem', padding: '8px 12px' }}>Nouvelle Simulation</button>
        <button onClick={() => onNavigate('history')} style={{ marginRight: '10px', fontSize: '1rem', padding: '8px 12px' }}>Historique</button>
        <button onClick={() => onNavigate('dashboard')} style={{ fontSize: '1rem', padding: '8px 12px' }}>Tableau de Bord</button>
      </div>
    </nav>
  );
};

export default Navbar;
