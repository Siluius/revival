import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import type { User } from '@angular/fire/auth';
import { AuthService } from '../../../shared/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  protected readonly displayName = signal<string | null>('');

  constructor() {
    this.auth.authState$.subscribe((user: User | null) => this.displayName.set(user?.displayName ?? user?.email ?? null));
  }
}


