import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth/auth-service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Languageswitcher } from '../languageswitcher/languageswitcher';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule , CommonModule, Languageswitcher, TranslocoPipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm: FormGroup;
errorMessage = signal('');
  isLoading = signal(false);
  showPassword: boolean = false;
  rememberMe: boolean = false;
  
  constructor(private fb: FormBuilder, private auth: AuthService , private router: Router){
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required],
      rememberMe: [false],
    });
  }

 togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(){
    if(this.loginForm.invalid || this.isLoading()) return;
    const {userName , password} = this.loginForm.value;
    this.errorMessage.set('');
    this.isLoading.set(true);
    this.auth.login(userName , password).subscribe({
      next: (res)=>{
        // Agents land on the analytics dashboard; providers keep their home page
        const role = (this.auth.getRole() ?? '').toUpperCase();
        const isAgent = role === 'CLINETAGENT' || role === 'SITEAGENT';
        this.router.navigate([isAgent ? '/home' : '/mem'])
          .finally(()=> this.isLoading.set(false));
      },
      error: (err)=>{
        this.isLoading.set(false);
        this.errorMessage.set('login Invalid');
      }
    });
  }

}
