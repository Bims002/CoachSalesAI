import React from 'react';
import type { SimulationRecord } from './HistoryView';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  history: SimulationRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  if (history.length === 0) {
    return <p className="placeholder-text" style={{ textAlign: 'center', marginTop: '20px' }}>Aucun progrès à afficher. Effectuez des simulations pour commencer.</p>;
  }

  // Préparer les données pour le graphique des scores
  // Trier l'historique par date pour le graphique
  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const scoreData = sortedHistory.map((record, index) => ({
    name: `Sim ${index + 1}`, // Ou utiliser record.date formaté si plus pertinent
    score: record.score ?? 0, // Utiliser 0 si le score est null
    date: new Date(record.date).toLocaleDateString(), // Pour l'infobulle
  }));

  // Calculer le score moyen
  const validScores = history.filter(record => record.score !== null);
  const averageScore = validScores.length > 0 
    ? validScores.reduce((acc, record) => acc + (record.score ?? 0), 0) / validScores.length
    : 0;

  // Calculer le nombre total de simulations
  const totalSimulations = history.length;

  // Extraire les conseils les plus fréquents
  const conseilsCount: Record<string, number> = {};
  history.forEach(record => {
    (record.summary || '').split(', ').forEach(conseil => {
      if (conseil.trim()) {
        conseilsCount[conseil.trim()] = (conseilsCount[conseil.trim()] || 0) + 1;
      }
    });
  });
  const topConseils = Object.entries(conseilsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([conseil]) => conseil);

  return (
    <div className="dashboard-container app-section"> {/* Ajout de app-section pour le style */}
      <h2>Tableau de bord des progrès</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', minWidth: '200px', margin: '10px' }}>
          <h3>Score Moyen</h3>
          <p style={{ fontSize: '2em', color: 'var(--color-accent)', margin: '0' }}>{averageScore.toFixed(1)} / 100</p>
        </div>
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', minWidth: '200px', margin: '10px' }}>
          <h3>Simulations Réalisées</h3>
          <p style={{ fontSize: '2em', color: 'var(--color-accent)', margin: '0' }}>{totalSimulations}</p>
        </div>
      </div>

      <h3>Évolution des Scores</h3>
      {scoreData.length > 1 ? ( // Afficher le graphique seulement si plus d'un point de données
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={scoreData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
            <YAxis domain={[0, 100]} stroke="var(--color-text-secondary)" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)'}} 
              labelFormatter={(label) => `Simulation: ${label}`}
              formatter={(value, name, props) => [`Score: ${value}`, `Date: ${props.payload.date}`]}
            />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="var(--color-accent)" strokeWidth={2} activeDot={{ r: 8 }} name="Score" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="placeholder-text" style={{ textAlign: 'center' }}>Effectuez au moins deux simulations pour voir l'évolution de vos scores.</p>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>Conseils les plus fréquents :</h3>
        {topConseils.length > 0 ? (
          <ul>
            {topConseils.map((conseil, index) => (
              <li key={index} style={{ padding: '10px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '6px', marginBottom: '8px' }}>{conseil}</li>
            ))}
          </ul>
        ) : (
          <p className="placeholder-text" style={{ textAlign: 'center' }}>(Aucun conseil récurrent pour le moment)</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
