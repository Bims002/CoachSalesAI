import React from 'react';

export interface SimulationRecord {
  id: string;
  date: string;
  scenarioTitle: string;
  score: number | null;
  summary: string;
}

interface HistoryViewProps {
  history: SimulationRecord[];
  onSelectRecord: (record: SimulationRecord) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelectRecord }) => {
  if (history.length === 0) {
    return <p>Aucun historique de simulation disponible.</p>;
  }

  return (
    <div className="history-view-container">
      <h3>Historique des simulations</h3>
      <ul>
        {history.map(record => (
          <li key={record.id} onClick={() => onSelectRecord(record)} style={{ cursor: 'pointer', marginBottom: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}>
            <strong>{record.scenarioTitle}</strong> - {record.date} - Score: {record.score !== null ? record.score : 'N/A'}
            <p style={{ margin: '5px 0' }}>{record.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryView;
