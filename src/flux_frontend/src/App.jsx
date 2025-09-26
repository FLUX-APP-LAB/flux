import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppRouter } from './router/AppRouter';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { useAppStore } from './store/appStore';

// Loading component for initialization
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-flux-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="loading-logo mb-4">FLUX</div>
        <div className="text-flux-text-secondary">Initializing...</div>
      </div>
    </div>
  );
}

// Theme effect component
function ThemeEffect() {
  const { theme } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return null;
}

// Component that handles auth initialization - MUST be inside WalletProvider
function AuthInitializer() {
  const { isInitializing } = useWallet(); // This hook is now available
  
  if (isInitializing) {
    return <LoadingScreen />;
  }
  
  return <AppContent />;
}

// App content that waits for auth initialization
function AppContent() {
  return (
    <>
      <ThemeEffect />
      <AppRouter />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--flux-bg-secondary)',
            color: '#ffffff',
            border: '1px solid var(--flux-bg-tertiary)',
          },
        }}
      />
    </>
  );
}

// Main App component
function App() {
  return (
    <WalletProvider>
      <AuthInitializer />
    </WalletProvider>
  );
}

export default App;