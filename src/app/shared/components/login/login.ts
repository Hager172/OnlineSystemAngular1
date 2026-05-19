import { Component } from '@angular/core';
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
  errorMessage: string='';
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
    if(this.loginForm.invalid) return;
    const {userName , password} = this.loginForm.value;
    this.auth.login(userName , password).subscribe({
      next: (res)=>{
        this.router.navigate(['/mem']);
      },
      error: (err)=>{
        this.errorMessage = 'login Invalid';
      }
    });
  }

}
