import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
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
import { CompanyService } from '../../../shared/company/company.service';
import { Subscription } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatInputModule],
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(Firestore);
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  private readonly company = inject(CompanyService);
  protected readonly profile = signal<AppUserProfile | null>(null);
  protected readonly saving = signal(false);
  private subscriptions: Subscription[] = [];

  // Get role from company membership (current company)
  protected readonly companyRole = toSignal(this.company.getMyCurrentCompanyRole$(), { initialValue: null });
  protected readonly displayRole = computed(() => {
    const role = this.companyRole();
    return role || 'No role assigned';
  });
  
  readonly form = this.fb.group({
    displayName: ['', [Validators.required]],
    email: [{ value: '', disabled: true }],
    role: [{ value: '', disabled: true }],
    theme: ['light', [Validators.required]]
  });

  ngOnInit(): void {
    // Subscribe to auth state
    const authSub = this.auth.authState$.subscribe(user => {
      if (!user) { 
        this.profile.set(null); 
        return; 
      }
      
      // Get user profile from Firestore
      const profileSub = docData(doc(this.firestore, `users/${user.uid}`)).subscribe((p: any) => {
        const initial: AppUserProfile = p ?? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'viewer',
          preferences: { theme: 'light' }
        } as any;
        
        this.profile.set(initial);
        
        // Get current theme from user preferences or default to light
        const currentTheme = (initial.preferences as any)?.['theme'] ?? 'light';
        const themeValue = currentTheme === 'theme-dark' ? 'dark' : 'light';
        
        this.form.patchValue({
          displayName: initial.displayName ?? '',
          email: initial.email ?? '',
          theme: themeValue
        });
        
        // Apply theme immediately
        this.themeService.set(currentTheme.startsWith('theme-') ? currentTheme : (themeValue === 'dark' ? 'theme-dark' : 'theme-light'));
      });
      
      this.subscriptions.push(profileSub);
    });
    
    this.subscriptions.push(authSub);

    // Subscribe to theme changes
    const themeSub = this.form.get('theme')?.valueChanges.subscribe(v => {
      const theme = v === 'dark' ? 'theme-dark' : 'theme-light';
      this.themeService.set(theme);
    });
    
    if (themeSub) {
      this.subscriptions.push(themeSub);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    
    try {
      const p = this.profile();
      if (!p) {
        console.error('No profile found');
        return;
      }
      
      const raw = this.form.getRawValue();
      const theme = raw.theme === 'dark' ? 'theme-dark' : 'theme-light';
      
      const updated: AppUserProfile = { 
        ...p, 
        displayName: raw.displayName ?? p.displayName ?? null, 
        preferences: { 
          ...(p.preferences ?? {}), 
          theme 
        } 
      };
      
      console.log('Saving profile:', updated);
      await setDoc(doc(this.firestore, `users/${p.uid}`), updated, { merge: true });
      console.log('Profile saved successfully');
      
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      this.saving.set(false);
    }
  }
}


