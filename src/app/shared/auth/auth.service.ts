import { Injectable, inject } from '@angular/core';
import { Auth, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, User } from '@angular/fire/auth';
import { Firestore, doc, docData, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { AppUserProfile } from './auth.interfaces';
import { ActivitiesService } from '../activities/activities.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly router = inject(Router);
  private readonly activities = inject(ActivitiesService);

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
      role: 'viewer',
      preferences: { theme: 'light' }
    };
    await setDoc(doc(this.firestore, `users/${cred.user.uid}`), profile);
    await setDoc(doc(this.firestore, `emails/${cred.user.uid}`), { uid: cred.user.uid, email: cred.user.email, createdAt: serverTimestamp() });
    await this.activities.logAuth('login', { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName ?? null });
    return cred.user;
  }

  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    await this.activities.logAuth('login', { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName ?? null });
    return cred.user;
  }

  async logout(): Promise<void> {
    const user = await this.getCurrentUser();
    await signOut(this.auth);
    if (user) {
      await this.activities.logAuth('logout', { uid: user.uid, email: user.email, displayName: user.displayName ?? null });
    }
    await this.router.navigateByUrl('/login');
  }

  getUserProfile$(uid: string) {
    return docData(doc(this.firestore, `users/${uid}`)) as unknown as AppUserProfile;
  }

  async getCurrentUser(): Promise<User | null> {
    return await firstValueFrom(this.authState$);
  }
}


