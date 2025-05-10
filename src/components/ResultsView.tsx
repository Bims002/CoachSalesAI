import React from 'react';

interface ResultsViewProps {
  // Props à définir: score, conseils, points à améliorer
  // score?: number;
  // advice?: string[];
  // areasForImprovement?: string[];
}

const ResultsView: React.FC<ResultsViewProps> = (/*{ score, advice, areasForImprovement }*/) => {
  return (
    <div className="results-view-container">
      <h3>Résultats de la simulation :</h3>
      {/* Affichage du score, des conseils, etc. */}
      <div>
        <h4>Score Global :</h4>
        <p className="placeholder-text">{/* score ? score : */ '(Score non disponible)'}</p>
      </div>
      <div>
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
