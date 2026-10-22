import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './components/App'

import './styles/index.css'
import './styles/ui.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <App />
);

// Offline cache for the installed app (production builds only: it would serve stale dev modules).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { }));
}