import React, { useState } from 'react';

interface ContextInputProps {
  onSubmitContext: (context: string) => void;
  selectedScenarioTitle?: string;
}

const ContextInput: React.FC<ContextInputProps> = ({ onSubmitContext, selectedScenarioTitle }) => {
  const [context, setContext] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (context.trim()) {
      onSubmitContext(context.trim());
    }
  };

  return (
    <div className="context-input-container app-section">
      <h2>Étape 2: Fournir un contexte pour la simulation</h2>
      {selectedScenarioTitle && <p style={{ marginBottom: '15px' }}>Scénario choisi : <strong>{selectedScenarioTitle}</strong></p>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="userContext" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Décrivez brièvement le produit/service que vous vendez, ou toute information pertinente pour le client IA :
        </label>
        <textarea
          id="userContext"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={5}
          placeholder="Ex: Je vends une solution SaaS de gestion de projet pour les PME..."
          required
          style={{ 
            width: '100%', 
            padding: '12px', 
            marginBottom: '20px', 
            borderRadius: '8px', 
            border: '1px solid var(--color-border)', 
            backgroundColor: 'var(--color-bg-secondary)', 
            color: 'var(--color-text-primary)',
            fontSize: '1rem',
            minHeight: '100px'
          }}
        />
        <button type="submit" disabled={!context.trim()} style={{ width: '100%' }}>
          Démarrer la Simulation Vocale
        </button>
      </form>
    </div>
  );
};

export default ContextInput;
