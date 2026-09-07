import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './api/client';
import './globals.css';
import { LoginPage } from './components/dashboard/LoginPage';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient();

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('manhaj_access_token'));
  const [toast, setToast] = useState('');
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400); };

  if (!token) return <LoginPage onLogin={(nextToken) => { localStorage.setItem('manhaj_access_token', nextToken); setToken(nextToken); }} />;

  return <BrowserRouter><AppRoutes notify={notify} />{toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">{toast}</div>}</BrowserRouter>;
}

createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>);
