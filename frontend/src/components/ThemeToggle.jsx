import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { resolvedTheme, cycleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={cycleTheme}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
