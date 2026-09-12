import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './api/client';
import './globals.css';
import { authClient } from './lib/auth-client';
import { LoginPage } from './components/dashboard/LoginPage';
import { AppRoutes } from './routes/AppRoutes';

import { Toaster } from './components/ui/sonner';

const queryClient = new QueryClient();

function App() {
  const { data: sessionData, isPending } = authClient.useSession();
  const [token, setToken] = useState(() => localStorage.getItem('manhaj_access_token'));

  useEffect(() => {
    if (sessionData?.session?.token && !token) {
      localStorage.setItem('manhaj_access_token', sessionData.session.token);
      setToken(sessionData.session.token);
    }
  }, [sessionData, token]);

  if (isPending && !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-700 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {!token && !sessionData?.session ? (
        <LoginPage
          onLogin={(nextToken) => {
            localStorage.setItem('manhaj_access_token', nextToken);
            setToken(nextToken);
          }}
        />
      ) : (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      )}
      <Toaster position="bottom-right" richColors />
    </>
  );
}


createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
