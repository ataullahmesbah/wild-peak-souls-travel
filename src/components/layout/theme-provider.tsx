'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'wps-theme';

interface ThemeContextValue {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme): 'light' | 'dark' {
  const resolved =
    theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // Private browsing or blocked storage — fall through to the default.
  }
  return 'system';
}

/**
 * The stored theme and the OS preference are both external stores, so they are
 * read through `useSyncExternalStore` rather than copied into state inside an
 * effect. That keeps the value correct on the very first client render and
 * avoids the cascading re-render a setState-in-effect would cause.
 */
const themeStore = {
  subscribe(onChange: () => void): () => void {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    // `storage` fires when another tab changes the theme; the custom event
    // covers changes made in this tab.
    window.addEventListener('storage', onChange);
    window.addEventListener(THEME_EVENT, onChange);
    media.addEventListener('change', onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(THEME_EVENT, onChange);
      media.removeEventListener('change', onChange);
    };
  },
  getSnapshot(): string {
    const theme = readStoredTheme();
    const resolved =
      theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
    return `${theme}:${resolved}`;
  },
  // On the server there is no storage and no media query — the inline script in
  // the document head applies the real theme before paint.
  getServerSnapshot(): string {
    return 'system:light';
  },
};

const THEME_EVENT = 'wps-theme-change';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = React.useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );

  const [theme, resolvedFromStore] = snapshot.split(':') as [Theme, 'light' | 'dark'];

  const setTheme = React.useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked — the class below still applies for this session.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  // Keeps the <html> class in sync when the OS preference changes while the
  // page is open. This writes to the DOM (an external system), not to state.
  React.useEffect(() => {
    applyTheme(theme);
  }, [theme, resolvedFromStore]);

  const value = React.useMemo(
    () => ({ theme, resolved: resolvedFromStore, setTheme }),
    [theme, resolvedFromStore, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/**
 * Runs before paint to apply the stored theme, so a dark-mode visitor never
 * sees a white flash on first load.
 */
export const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var dark = stored === 'dark' || ((!stored || stored === 'system') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {}
})();
`;

const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5',
        className,
      )}
      role="radiogroup"
      aria-label="Colour theme"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          onClick={() => setTheme(value)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200',
            theme === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
