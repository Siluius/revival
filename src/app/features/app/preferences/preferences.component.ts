import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { AuthService } from '../../../shared/auth/auth.service';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AppUserProfile } from '../../../shared/auth/auth.interfaces';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
  templateUrl: './preferences.component.html'
})
export class PreferencesComponent {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(Firestore);
  private readonly fb = inject(FormBuilder);
  protected readonly profile = signal<AppUserProfile | null>(null);
  protected readonly saving = signal(false);
  readonly form = this.fb.group({ theme: 'light' });

  constructor() {
    this.auth.authState$.subscribe(user => {
      if (!user) { this.profile.set(null); return; }
      const initial: AppUserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: 'viewer',
        preferences: { theme: 'light' }
      };
      this.profile.set(initial);
      this.form.patchValue({ theme: initial.preferences?.['theme'] as string ?? 'light' });
    });
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const p = this.profile();
      if (!p) return;
      const updated: AppUserProfile = { ...p, preferences: { ...(p.preferences ?? {}), theme: this.form.getRawValue().theme } };
      await setDoc(doc(this.firestore, `users/${p.uid}`), updated, { merge: true });
    } finally {
      this.saving.set(false);
    }
  }
}


