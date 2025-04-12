import { Injectable } from '@angular/core';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, Auth, getAuth, isEmailVerified, sendEmailVerification } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth;

  constructor(
    ) { 
      this.auth = getAuth();
    }

  async registerUser(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      return userCredential
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  }

  async loginUser(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      if (!isEmailVerified(user)) {
        throw new Error('Email not verified');
      }
      return userCredential
    } catch (error) {
      console.error("Error logging in user:", error);
      throw error;
    }
  }
}
