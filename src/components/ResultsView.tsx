import React from 'react';
import type { Message } from '../App'; // Assurez-vous que ce chemin est correct

interface AnalysisResults {
  score?: number;
  conseils?: string[];
  ameliorations?: string[];
  techniquesDeVenteConseils?: string[]; 
}

interface ResultsViewProps {
  analysisResults: AnalysisResults | null;
  selectedScenarioTitle?: string | null;
  conversation: Message[]; // Réintroduit pour le téléchargement
  userContext?: string; // Ajouter le contexte utilisateur pour le téléchargement
  onNewSimulation: () => void;
  isAnalyzing: boolean;
}

const ResultsView: React.FC<ResultsViewProps> = ({ 
  analysisResults, 
  selectedScenarioTitle, 
  conversation, 
  userContext,
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

  const handleDownload = () => {
    if (!analysisResults || !selectedScenarioTitle) return;

    let content = `Simulation CoachSales AI\n`;
    content += `=========================\n\n`;
    content += `Scénario: ${selectedScenarioTitle}\n`;
    if (userContext) {
      content += `Contexte initial fourni: ${userContext}\n`;
    }
    content += `Date: ${new Date().toLocaleString()}\n\n`;

    content += `--- Transcription de la Conversation ---\n`;
    conversation.forEach(msg => {
      content += `${msg.sender === 'user' ? 'Vous' : 'Client IA'}: ${msg.text}\n`;
    });
    content += `\n--- Fin de la Transcription ---\n\n`;

    content += `--- Analyse de la Simulation ---\n`;
    content += `Score Global: ${analysisResults.score !== undefined ? analysisResults.score + ' / 100' : 'Non disponible'}\n\n`;
    
    content += `Conseils Personnalisés:\n`;
    if (analysisResults.conseils && analysisResults.conseils.length > 0) {
      analysisResults.conseils.forEach(c => content += `- ${c}\n`);
    } else {
      content += `(Aucun conseil spécifique)\n`;
    }
    content += `\n`;

    content += `Points à Améliorer:\n`;
    if (analysisResults.ameliorations && analysisResults.ameliorations.length > 0) {
      analysisResults.ameliorations.forEach(a => content += `- ${a}\n`);
    } else {
      content += `(Aucun point d'amélioration spécifique)\n`;
    }
    content += `\n--- Fin de l'Analyse ---\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `simulation_coachsales_${selectedScenarioTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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

  const { score, conseils, ameliorations, techniquesDeVenteConseils } = analysisResults;

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

      {techniquesDeVenteConseils && techniquesDeVenteConseils.length > 0 && (
        <div style={cardStyle}>
          <h3 style={titleStyle}>Conseils sur les Techniques de Vente</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {techniquesDeVenteConseils.map((item, index) => <li key={index} style={listItemStyle}>💡 {item}</li>)}
          </ul>
        </div>
      )}
      
      <button onClick={onNewSimulation} style={{ marginTop: '30px', width: '100%', fontSize: '1.2em', padding: '15px 0' }}>
        🚀 Nouvelle Simulation
      </button>

      <button 
        onClick={handleDownload} 
        style={{ 
          marginTop: '20px', 
          width: '100%', 
          fontSize: '1.1em', 
          padding: '12px 0', 
          backgroundColor: 'var(--color-text-secondary)', 
          color: 'var(--color-bg)' 
        }}
        disabled={!analysisResults} // Désactiver si pas de résultats
      >
        💾 Télécharger la Simulation (.txt)
      </button>
    </div>
  );
};

export default ResultsView;
