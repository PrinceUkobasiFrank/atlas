import type { AppData, Theme } from './types';

const THEME_ATTR = 'data-theme';

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute(THEME_ATTR, theme);
}

export function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function toggleTheme(data: AppData): Theme {
  const newTheme: Theme = data.theme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  return newTheme;
}

export function initTheme(data: AppData): void {
  applyTheme(data.theme);
}
