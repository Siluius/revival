import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly active = signal(0);

  show(): void { this.active.update(n => n + 1); }
  hide(): void { this.active.update(n => Math.max(0, n - 1)); }

  async wrap<T>(fn: () => Promise<T>): Promise<T> {
    this.show();
    try { return await fn(); }
    finally { this.hide(); }
  }
}