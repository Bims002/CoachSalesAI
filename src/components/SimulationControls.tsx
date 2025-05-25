import React from 'react';

interface SimulationControlsProps {
  onStartListening: () => void;
  onStopListening: () => void;
  // onPauseListening: () => void; // Retiré pour simplifier à Start/Stop pour l'instant
  isListening: boolean;
  // isPaused: boolean; // Retiré
  disabled?: boolean;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({ 
  onStartListening, 
  onStopListening, 
  isListening, 
  disabled 
}) => {
  return (
    <div className="simulation-controls" style={{ textAlign: 'center', marginTop: '20px' }}>
      <button 
        onClick={isListening ? onStopListening : onStartListening}
        disabled={disabled}
        className={isListening ? 'mic-button listening' : 'mic-button'} // Classe pour le style
        style={{ // Styles de base, les animations/changements de couleur via CSS
          padding: '15px 30px',
          fontSize: '1.2em',
          color: 'white',
          borderRadius: '50px', 
          minWidth: '220px', // Un peu plus large pour le texte
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto' // Centrer le bouton
        }}
      >
        <span 
          className={isListening ? 'mic-icon-listening' : ''} 
          style={{ marginRight: '10px', fontSize: '1.3em', display: 'inline-block' }} // display:inline-block pour que transform fonctionne
        >
          {isListening ? '🔴' : '🎤'}
        </span>
        {isListening ? 'Arrêter l\'écoute' : 'Démarrer l\'écoute'}
      </button>
      
      {/* Le message de conseil est maintenant dans App.tsx et s'affiche sous ces contrôles */}
      {/* Si un message d'erreur spécifique aux contrôles est nécessaire, il peut être ajouté ici */}
      {disabled && !isListening && (
        <p className="placeholder-text" style={{ marginTop: '15px', fontSize: '0.9rem' }}>
          (Veuillez d'abord choisir un scénario et fournir un contexte)
        </p>
      )}
    </div>
  );
};

export default SimulationControls;
