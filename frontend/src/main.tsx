import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { loadEngineData } from './services/engineData';

const container = document.getElementById('root')!;
container.textContent = 'Loading ASTRA-SN engine results…';

// The validated engine results (one precomputed year per catalogue site) are loaded before the app starts.
loadEngineData()
  .then(() => {
    container.textContent = '';
    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((err) => {
    container.textContent = `Could not load the engine results (${err}). Run "npm run sync-engine-data".`;
  });
