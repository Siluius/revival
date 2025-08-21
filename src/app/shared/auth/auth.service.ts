import { Injectable, inject } from '@angular/core';
import { Auth, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, User } from '@angular/fire/auth';
import { Firestore, doc, docData, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { AppUserProfile } from './auth.interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly router = inject(Router);

  readonly authState$ = authState(this.auth);
  readonly isAuthenticated$ = this.authState$.pipe(map(user => !!user));

  async register(email: string, password: string, displayName?: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    const profile: AppUserProfile = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName ?? displayName ?? null,
      preferences: {}
    };
    await setDoc(doc(this.firestore, `users/${cred.user.uid}`), profile);
    return cred.user;
  }

  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return cred.user;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigateByUrl('/login');
  }

  getUserProfile$(uid: string) {
    return docData(doc(this.firestore, `users/${uid}`)) as unknown as AppUserProfile;
  }

  async getCurrentUser(): Promise<User | null> {
    return await firstValueFrom(this.authState$);
  }
}


