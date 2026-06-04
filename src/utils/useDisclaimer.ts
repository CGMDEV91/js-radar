import { useState } from 'react';

const STORAGE_KEY = 'jsradar_disclaimer_accepted_v1';

export function useDisclaimer() {
  const [accepted, setAccepted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch { /* ignore */ }
    setAccepted(true);
  }

  return { accepted, accept };
}
