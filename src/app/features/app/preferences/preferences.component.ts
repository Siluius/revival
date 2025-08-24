import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../shared/auth/auth.service';
import { Firestore, doc, setDoc, docData } from '@angular/fire/firestore';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AppUserProfile } from '../../../shared/auth/auth.interfaces';
import { MatInputModule } from '@angular/material/input';
import { ThemeService } from '../../../shared/theme/theme.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatInputModule],
  templateUrl: './preferences.component.html'
})
export class PreferencesComponent {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(Firestore);
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  protected readonly profile = signal<AppUserProfile | null>(null);
  protected readonly saving = signal(false);
  readonly form = this.fb.group({
    displayName: ['', [Validators.required]],
    email: [{ value: '', disabled: true }],
    theme: ['light', [Validators.required]]
  });

  constructor() {
    this.auth.authState$.subscribe(user => {
      if (!user) { this.profile.set(null); return; }
      docData(doc(this.firestore, `users/${user.uid}`)).subscribe((p: any) => {
        const initial: AppUserProfile = p ?? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'viewer',
          preferences: { theme: 'light' }
        } as any;
        this.profile.set(initial);
        this.form.patchValue({
          displayName: initial.displayName ?? '',
          email: initial.email ?? '',
          theme: (initial.preferences as any)?.['theme'] ?? 'light'
        });
        // apply live theme
        this.themeService.set((this.form.getRawValue().theme as 'theme-light' | 'theme-dark').startsWith('theme-') ? (this.form.getRawValue().theme as any) : (this.form.getRawValue().theme === 'dark' ? 'theme-dark' : 'theme-light'));
      });
    });

    this.form.get('theme')?.valueChanges.subscribe(v => {
      const theme = v === 'dark' || v === 'theme-dark' ? 'theme-dark' : 'theme-light';
      this.themeService.set(theme);
    });
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const p = this.profile();
      if (!p) return;
      const raw = this.form.getRawValue();
      const theme = raw.theme === 'dark' || raw.theme === 'theme-dark' ? 'theme-dark' : 'theme-light';
      const updated: AppUserProfile = { ...p, displayName: raw.displayName ?? p.displayName ?? null, preferences: { ...(p.preferences ?? {}), theme } };
      await setDoc(doc(this.firestore, `users/${p.uid}`), updated, { merge: true });
    } finally {
      this.saving.set(false);
    }
  }
}


