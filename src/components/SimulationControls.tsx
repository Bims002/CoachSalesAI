import React from 'react';

interface SimulationControlsProps {
  onStartListening: () => void;
  onStopListening: () => void;
  onPauseListening: () => void;
  isListening: boolean;
  isPaused: boolean;
  disabled?: boolean;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({ onStartListening, onStopListening, onPauseListening, isListening, isPaused, disabled }) => {
  return (
    <div className="simulation-controls-container">
      {!isListening && !isPaused && (
        <button onClick={onStartListening} disabled={disabled}>
          Lancer une simulation (Parler)
        </button>
      )}
      {isListening && (
        <button onClick={onPauseListening} disabled={disabled}>
          Pause
        </button>
      )}
      {isPaused && (
        <button onClick={onStopListening} disabled={disabled}>
          Arrêter l'écoute
        </button>
      )}
      {disabled && !isListening && !isPaused && (
        <p className="placeholder-text" style={{ marginTop: '10px' }}>
          Veuillez sélectionner un scénario pour activer ce bouton.
        </p>
      )}
      {(isListening || isPaused) && (
        <p className="placeholder-text" style={{ color: '#28a745', marginTop: '10px', fontWeight: 'bold' }}>
          🎤 {isPaused ? 'Écoute en pause...' : 'Écoute en cours... Parlez maintenant.'}
        </p>
      )}
    </div>
  );
};

export default SimulationControls;
