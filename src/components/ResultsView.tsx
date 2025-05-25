import React from 'react';
import type { Message } from '../App'; // Assurez-vous que ce chemin est correct

interface AnalysisResults {
  score?: number;
  conseils?: string[];
  ameliorations?: string[];
  // Ajoutez d'autres champs si Gemini peut les fournir, ex: pointsForts?: string[];
}

interface ResultsViewProps {
  analysisResults: AnalysisResults | null;
  selectedScenarioTitle?: string | null;
  // conversation: Message[]; // Retiré car non utilisé pour l'instant dans cette version
  onNewSimulation: () => void;
  isAnalyzing: boolean;
}

const ResultsView: React.FC<ResultsViewProps> = ({ 
  analysisResults, 
  selectedScenarioTitle, 
  // conversation, // Retiré
  onNewSimulation, 
  isAnalyzing 
}) => {
  
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-secondary)',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  };

  const titleStyle: React.CSSProperties = {
    color: 'var(--color-accent)',
    borderBottom: '2px solid var(--color-border)',
    paddingBottom: '10px',
    marginBottom: '20px'
  };

  const listItemStyle: React.CSSProperties = {
    marginBottom: '10px',
    padding: '10px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '6px',
    border: '1px solid var(--color-border)'
  };

  if (isAnalyzing) {
    return (
      <div className="app-section" style={{ textAlign: 'center', ...cardStyle }}>
        <h2 style={titleStyle}>Analyse en Cours</h2>
        <p className="placeholder-text" style={{ fontSize: '1.2em', padding: '30px 0' }}>📊 Veuillez patienter pendant que nous analysons votre simulation...</p>
      </div>
    );
  }

  if (!analysisResults) {
    return (
      <div className="app-section" style={cardStyle}>
        <h2 style={titleStyle}>Résultats de la Simulation</h2>
        <p className="placeholder-text" style={{ textAlign: 'center', fontSize: '1.1em', padding: '20px 0' }}>
          (Aucun résultat d'analyse disponible pour le moment)
        </p>
        <button onClick={onNewSimulation} style={{ width: '100%' }}>Nouvelle Simulation</button>
      </div>
    );
  }

  const { score, conseils, ameliorations } = analysisResults;

  return (
    <div className="results-view-container app-section" style={{ backgroundColor: 'var(--color-bg)', border: 'none', boxShadow: 'none' }}>
      <h2 style={{ color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: '30px' }}>Résultats de la Simulation</h2>
      
      {selectedScenarioTitle && 
        <p style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.2em', color: 'var(--color-text-secondary)' }}>
          Scénario : <strong style={{ color: 'var(--color-text-primary)' }}>{selectedScenarioTitle}</strong>
        </p>
      }

      <div style={cardStyle}>
        <h3 style={titleStyle}>Score Global</h3>
        <p style={{ fontSize: '3em', fontWeight: 'bold', color: 'var(--color-accent)', margin: '10px 0 20px 0', textAlign: 'center' }}>
          {score !== undefined ? `${score} / 100` : '(Non disponible)'}
        </p>
      </div>

      <div style={cardStyle}>
        <h3 style={titleStyle}>Conseils Personnalisés</h3>
        {conseils && conseils.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {conseils.map((item, index) => <li key={index} style={listItemStyle}>💡 {item}</li>)}
          </ul>
        ) : (
          <p className="placeholder-text">(Aucun conseil spécifique pour cette simulation)</p>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={titleStyle}>Points à Améliorer</h3>
        {ameliorations && ameliorations.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {ameliorations.map((item, index) => <li key={index} style={listItemStyle}>🛠️ {item}</li>)}
          </ul>
        ) : (
          <p className="placeholder-text">(Aucun point d'amélioration spécifique identifié)</p>
        )}
      </div>
      
      {/* Optionnel: Afficher la transcription ici si souhaité */}
      {/* 
      <div style={cardStyle}>
        <h3 style={titleStyle}>Transcription Complète</h3>
        <div className="messages-list" style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: 'var(--color-bg)', padding: '15px', borderRadius: '8px' }}>
          {conversation.length > 0 ? (
            conversation.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`} style={{ maxWidth: '100%', marginBottom: '10px' }}>
                <p><strong>{msg.sender === 'user' ? 'Vous' : 'Client IA'}:</strong> {msg.text}</p>
              </div>
            ))
          ) : (
            <p className="placeholder-text">(Aucune conversation enregistrée)</p>
          )}
        </div>
      </div>
      */}

      <button onClick={onNewSimulation} style={{ marginTop: '30px', width: '100%', fontSize: '1.2em', padding: '15px 0' }}>
        🚀 Nouvelle Simulation
      </button>
    </div>
  );
};

export default ResultsView;
