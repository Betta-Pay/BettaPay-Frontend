import { useState, useEffect } from 'react';

export function useSimulatedLoading(delay = 500) {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return isLoading;
}
