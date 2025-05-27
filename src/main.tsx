import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App'; // Assurez-vous que App.tsx exporte par défaut le composant App
import { AuthProvider } from './contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  );
} else {
  console.error("L'élément racine 'root' est introuvable dans le DOM.");
}
