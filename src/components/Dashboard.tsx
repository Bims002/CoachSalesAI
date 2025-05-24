import React from 'react';
import type { SimulationRecord } from './HistoryView';

interface DashboardProps {
  history: SimulationRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  if (history.length === 0) {
    return <p>Aucun progrès à afficher. Effectuez des simulations pour commencer.</p>;
  }

  // Calculer le score moyen
  const averageScore = history.reduce((acc, record) => acc + (record.score ?? 0), 0) / history.length;

  // Calculer le nombre total de simulations
  const totalSimulations = history.length;

  // Extraire les conseils les plus fréquents
  const conseilsCount: Record<string, number> = {};
  history.forEach(record => {
    record.summary?.split(', ').forEach(conseil => {
      if (conseil) {
        conseilsCount[conseil] = (conseilsCount[conseil] || 0) + 1;
      }
    });
  });
  const topConseils = Object.entries(conseilsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([conseil]) => conseil);

  return (
    <div className="dashboard-container">
      <h2>Tableau de bord des progrès</h2>
      <p><strong>Score moyen :</strong> {averageScore.toFixed(1)} / 100</p>
      <p><strong>Nombre total de simulations :</strong> {totalSimulations}</p>
      <div>
        <h3>Conseils les plus fréquents :</h3>
        {topConseils.length > 0 ? (
          <ul>
            {topConseils.map((conseil, index) => (
              <li key={index}>{conseil}</li>
            ))}
          </ul>
        ) : (
          <p>(Aucun conseil disponible)</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
