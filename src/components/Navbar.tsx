import React from 'react';

const Navbar: React.FC = () => {
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
        {/* Placeholder for future menu items */}
      </div>
    </nav>
  );
};

export default Navbar;
