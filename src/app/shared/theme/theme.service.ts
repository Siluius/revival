import { Injectable, effect, signal } from '@angular/core';

export type AppTheme = 'theme-light' | 'theme-dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<AppTheme>('theme-light');

  constructor() {
    const saved = (localStorage.getItem('app-theme') as AppTheme | null) ?? 'theme-light';
    this.theme.set(saved);
    effect(() => {
      const current = this.theme();
      document.body.classList.remove('theme-light', 'theme-dark');
      document.body.classList.add(current);
      // Keep AG Grid in sync with app theme per theme modes
      // https://www.ag-grid.com/angular-data-grid/theming-colors/#colour-schemes
      document.body.setAttribute('data-ag-theme-mode', current === 'theme-dark' ? 'dark' : 'light');
      localStorage.setItem('app-theme', current);
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'theme-light' ? 'theme-dark' : 'theme-light');
  }

  set(theme: AppTheme): void {
    this.theme.set(theme);
  }
}


