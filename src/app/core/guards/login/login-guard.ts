import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {

    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');

    if (role || token) {
      localStorage.clear(); // logout
    }

    return true;
  }
}
