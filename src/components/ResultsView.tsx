import React from 'react';
import type { Message } from '../App'; // Importer le type Message

interface ResultsViewProps {
  conversation: Message[];
  // score?: number; // À implémenter plus tard
  // advice?: string[]; // À implémenter plus tard
  // areasForImprovement?: string[]; // À implémenter plus tard
}

const ResultsView: React.FC<ResultsViewProps> = ({ conversation /*, score, advice, areasForImprovement*/ }) => {
  return (
    <div className="results-view-container">
      <h3>Résultats de la simulation :</h3>
      
      <div>
        <h4>Transcription complète :</h4>
        <div className="messages-list" style={{maxHeight: '400px', border: '1px solid #ccc', padding: '10px', borderRadius: '4px', background: '#f9f9f9'}}>
          {conversation.length > 0 ? (
            conversation.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`} style={{maxWidth: '100%', marginBottom: '8px'}}>
                <p><strong>{msg.sender === 'user' ? 'Vous' : 'Client IA'}:</strong> {msg.text}</p>
              </div>
            ))
          ) : (
            <p className="placeholder-text">(Aucune conversation enregistrée)</p>
          )}
        </div>
      </div>

      <div style={{marginTop: '20px'}}>
        <h4>Score Global :</h4>
        <p className="placeholder-text">{/* score ? score : */ '(Score non disponible)'}</p>
      </div>
      <div style={{marginTop: '20px'}}>
        <h4>Conseils personnalisés :</h4>
        <ul>
          {/* {advice && advice.map((item, index) => <li key={index}>{item}</li>)}
          {!advice && <li className="placeholder-text">Aucun conseil pour le moment.</li>} */}
          <li className="placeholder-text">(Conseil 1...)</li>
          <li className="placeholder-text">(Conseil 2...)</li>
        </ul>
      </div>
      <div>
        <h4>Points à améliorer :</h4>
        <ul>
          {/* {areasForImprovement && areasForImprovement.map((item, index) => <li key={index}>{item}</li>)}
          {!areasForImprovement && <li className="placeholder-text">Aucun point spécifique pour le moment.</li>} */}
          <li className="placeholder-text">(Point d'amélioration 1...)</li>
          <li className="placeholder-text">(Point d'amélioration 2...)</li>
        </ul>
      </div>
    </div>
  );
};

export default ResultsView;
