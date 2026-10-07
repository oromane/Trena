'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.getAttribute('data-theme') === 'light');
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem('trena-theme', next ? 'light' : 'dark');
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={light ? 'Passer en thème sombre' : 'Passer en thème clair'}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ats-muted transition-colors hover:bg-ats-card2 hover:text-ats-text"
    >
      {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
