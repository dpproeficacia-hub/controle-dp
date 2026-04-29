import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Mantém o backend acordado (Render free dorme após 15min)
setInterval(() => {
  fetch('https://controle-dp-backend.onrender.com/health').catch(() => {});
}, 10 * 60 * 1000);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
