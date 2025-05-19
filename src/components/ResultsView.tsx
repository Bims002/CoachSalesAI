import React from 'react';
import type { Message } from '../App';

interface ResultsViewProps {
  conversation: Message[];
  score?: number;
  conseils?: string[];
  ameliorations?: string[];
}

const ResultsView: React.FC<ResultsViewProps> = ({ conversation, score, conseils, ameliorations }) => {
  return (
    <div className="results-view-container">
      <h3>Résultats de la simulation :</h3>

      <div>
        <h4>Transcription complète :</h4>
        <div className="messages-list" style={{ maxHeight: '400px', border: '1px solid #ccc', padding: '10px', borderRadius: '4px', background: '#f9f9f9' }}>
          {conversation.length > 0 ? (
            conversation.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`} style={{ maxWidth: '100%', marginBottom: '8px' }}>
                <p><strong>{msg.sender === 'user' ? 'Vous' : 'Client IA'}:</strong> {msg.text}</p>
              </div>
            ))
          ) : (
            <p className="placeholder-text">(Aucune conversation enregistrée)</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '1.5em', fontWeight: 'bold', color: '#007bff' }}>
        <h4>Score Global (sur 100) :</h4>
        <p>{score !== undefined ? `${score} / 100` : '(Score non disponible)'}</p>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h4>Conseils personnalisés :</h4>
        <ul>
          {conseils && conseils.length > 0 ? (
            conseils.map((item, index) => <li key={index}>{item}</li>)
          ) : (
            <li className="placeholder-text">(Aucun conseil pour le moment)</li>
          )}
        </ul>
      </div>
      <div>
        <h4>Points à améliorer :</h4>
        <ul>
          {ameliorations && ameliorations.length > 0 ? (
            ameliorations.map((item, index) => <li key={index}>{item}</li>)
          ) : (
            <li className="placeholder-text">(Aucun point spécifique pour le moment)</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ResultsView;
