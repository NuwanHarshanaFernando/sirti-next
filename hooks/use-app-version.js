'use client';

import { useState, useEffect } from 'react';

export function useAppVersion() {
  const [version, setVersion] = useState('0.0.0');
  
  useEffect(() => {
    // In client-side code we can access NEXT_PUBLIC_ variables directly
    if (process.env.NEXT_PUBLIC_APP_VERSION) {
      setVersion(process.env.NEXT_PUBLIC_APP_VERSION);
    }
  }, []);

  return version;
}
