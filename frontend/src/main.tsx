import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { loadEngineData } from './services/engineData';

const container = document.getElementById('root')!;
container.textContent = 'Loading ASTRA-SN engine results…';

// The validated engine results (one precomputed year per catalogue site) are loaded before the app starts.
// App is imported only afterwards: the mission store computes the default sites when its module loads,
// and those analyses must come from the engine data, not from the browser fallback.
loadEngineData()
  .then(() => import('./App'))
  .then(({ default: App }) => {
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
