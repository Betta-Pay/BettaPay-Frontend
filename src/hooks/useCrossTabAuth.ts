import { useEffect } from 'react';

export const useCrossTabAuth = () => {
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        // sync auth state
      }
    };

    window.addEventListener('storage', handleStorage);
    
    // Fix: Clean up event listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
};
