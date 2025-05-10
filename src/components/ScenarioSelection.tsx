import React from 'react';
import type { Scenario } from '../App'; // Utiliser import type

interface ScenarioSelectionProps {
  scenarios: Scenario[];
  selectedScenario: Scenario | null;
  onSelectScenario: (scenario: Scenario) => void;
}

const ScenarioSelection: React.FC<ScenarioSelectionProps> = ({ scenarios, selectedScenario, onSelectScenario }) => {
  return (
    <div className="scenario-selection-container">
      <h3>Choisissez un scénario :</h3>
      <ul>
        {scenarios.map((scenario) => (
          <li 
            key={scenario.id} 
            onClick={() => onSelectScenario(scenario)}
            className={selectedScenario?.id === scenario.id ? 'selected' : ''}
            title={scenario.description} // Afficher la description au survol
          >
            {scenario.title}
          </li>
        ))}
      </ul>
      {selectedScenario && (
        <div className="selected-scenario-description">
          <h4>Description du scénario :</h4>
          <p className="placeholder-text">{selectedScenario.description}</p>
        </div>
      )}
    </div>
  );
};

export default ScenarioSelection;
