import React from 'react';

interface GlobalLoaderProps {
  isLoading: boolean;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ isLoading }) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="global-loader-overlay">
      <div className="global-loader-content">
        <div className="global-spinner"></div>
        {/* Message retiré */}
      </div>
    </div>
  );
};

export default GlobalLoader;
