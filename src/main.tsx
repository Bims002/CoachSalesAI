import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App'; // Assurez-vous que App.tsx exporte par défaut le composant App
import { AuthProvider } from './contexts/AuthContext';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
} else {
  console.error("L'élément racine 'root' est introuvable dans le DOM.");
}
