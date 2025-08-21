import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/auth/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private clearFirebaseErrors(): void {
    const emailControl = this.form.get('email');
    const passwordControl = this.form.get('password');

    for (const control of [emailControl, passwordControl]) {
      if (!control) continue;
      const currentErrors = control.errors ?? {};
      if ('firebase' in currentErrors) {
        // Remove only the firebase error while preserving other validator errors
        const { firebase, ...rest } = currentErrors as Record<string, any>;
        const nextErrors = Object.keys(rest).length ? rest : null;
        control.setErrors(nextErrors);
      }
    }
  }

  private setFirebaseFieldError(controlName: 'email' | 'password', message: string): void {
    const control = this.form.get(controlName);
    if (!control) return;
    const currentErrors = control.errors ?? {};
    control.setErrors({ ...currentErrors, firebase: message });
    control.markAsTouched();
  }

  async onSubmit(): Promise<void> {
    if (this.loading()) return;
    this.error.set(null);
    this.clearFirebaseErrors();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email!, password!);
      await this.router.navigateByUrl('/app/dashboard');
    } catch (e: any) {
      const code: string | undefined = e?.code;
      switch (code) {
        case 'auth/invalid-email':
          this.setFirebaseFieldError('email', 'Enter a valid email');
          break;
        case 'auth/user-disabled':
          this.setFirebaseFieldError('email', 'This account has been disabled');
          break;
        case 'auth/user-not-found':
          this.setFirebaseFieldError('email', 'No account found with this email');
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          this.setFirebaseFieldError('password', 'Incorrect email or password');
          break;
        case 'auth/too-many-requests':
          this.setFirebaseFieldError('password', 'Too many attempts. Try again later');
          break;
        case 'auth/network-request-failed':
          this.setFirebaseFieldError('email', 'Network error. Check your connection');
          break;
        default:
          // Fallback: attach to password so it appears in the form
          this.setFirebaseFieldError('password', e?.message ?? 'Login failed');
          break;
      }
      this.form.markAllAsTouched();
      this.error.set(e?.message ?? 'Login failed');
    } finally {
      this.loading.set(false);
    }
  }
}


