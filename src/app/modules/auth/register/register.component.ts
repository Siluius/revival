import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  imports: [],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})

export class RegisterComponent {
  email!: string;
  password!: string;

  constructor(private authService: AuthService) { }

  register() {
    this.authService.registerUser(this.email, this.password).then(result => {
      console.log(result);
    }).catch(error => {
      console.error(error);
    });
  }
}
