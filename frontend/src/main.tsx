import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Interceptador global de Fetch para controle rigoroso de sessão e inativação de conta
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 403) {
    try {
      const clone = response.clone();
      const data = await clone.json();
      if (data && (data.code === 'USER_INACTIVE' || (data.error && String(data.error).toLowerCase().includes('inativa')))) {
        localStorage.clear();
        alert('Sua conta está inativa ou suspensa. Entre em contato com a administração para restabelecer o acesso ao sistema.');
        window.location.href = '/login';
      }
    } catch {}
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
