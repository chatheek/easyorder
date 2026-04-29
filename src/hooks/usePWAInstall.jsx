import { useEffect, useState } from 'react';

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  return { installPrompt, installApp };
}