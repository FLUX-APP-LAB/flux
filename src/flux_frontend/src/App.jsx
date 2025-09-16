import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppRouter } from './router/AppRouter';
import { WalletProvider } from './contexts/WalletContext';
import { useAppStore } from './store/appStore';

// Theme effect component
function ThemeEffect() {
  const { theme } = useAppStore();

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return null;
}

// Main App component with WalletProvider
function App() {
  return (
    <WalletProvider>
      <ThemeEffect />
      <AppRouter />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--flux-bg-secondary)',
            color: 'var(--flux-text-primary)',
            border: '1px solid var(--flux-bg-tertiary)',
          },
        }}
      />
    </WalletProvider>
  );
}

export default App;