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
      {selectedScenarioTitle && <p style={{ marginBottom: '15px' }}>Scénario de base : <strong>{selectedScenarioTitle}</strong></p>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="userContext" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Ajoutez des détails sur le comportement du client IA, ses objections spécifiques, ou le produit/service que vous souhaitez simuler :
        </label>
        <textarea
          id="userContext"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={5}
          placeholder="Ex: Le client est sceptique sur le prix, il a déjà eu une mauvaise expérience avec un produit similaire. Je vends des panneaux solaires..."
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
