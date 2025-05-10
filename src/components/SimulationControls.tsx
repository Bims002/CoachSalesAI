import React from 'react';

interface SimulationControlsProps {
  onToggleListening: () => void; // Fonction pour démarrer/arrêter l'écoute
  isListening: boolean;         // Indique si l'écoute est active
  disabled?: boolean;            // Prop pour désactiver le bouton (si aucun scénario ou support navigateur)
}

const SimulationControls: React.FC<SimulationControlsProps> = ({ onToggleListening, isListening, disabled }) => {
  return (
    <div className="simulation-controls-container">
      <button onClick={onToggleListening} disabled={disabled}>
        {isListening ? 'Arrêter l\'écoute...' : 'Lancer une simulation (Parler)'}
      </button>
      {/* D'autres contrôles pourraient venir ici (ex: arrêter, pause) */}
      {disabled && !isListening && ( // Afficher seulement si désactivé ET qu'on n'écoute pas déjà
        <p className="placeholder-text" style={{ marginTop: '10px' }}>
          Veuillez sélectionner un scénario pour activer ce bouton.
        </p>
      )}
      {isListening && (
         <p className="placeholder-text" style={{ color: '#28a745', marginTop: '10px', fontWeight: 'bold' }}>
           🎤 Écoute en cours... Parlez maintenant.
         </p>
      )}
    </div>
  );
};

export default SimulationControls;
