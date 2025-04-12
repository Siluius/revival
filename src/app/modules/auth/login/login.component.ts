import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { sendPasswordResetEmail, Auth } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email!: string;
  password!: string;

  constructor(private authService: AuthService, private auth: Auth) {}

  login() {
    this.authService.loginUser(this.email, this.password)
      .then(response => {
        console.log(response);
      })
      .catch(error => {
        console.error(error);
      });
  }

  forgotPassword() {
    sendPasswordResetEmail(this.auth, this.email)
      .then(() => alert('Password reset email sent!'))
      .catch(error => console.error(error));
  }
}
}
