import { Injectable } from '@angular/core';

import { CanActivate, CanActivateChild, ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class logoutGuard implements CanActivate, CanActivateChild {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {

    return this.checkRole(route);
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {

    return this.checkRole(childRoute);
  }

  private checkRole(route: ActivatedRouteSnapshot): boolean {

    const role = localStorage.getItem('role');

    const expectedRoles = route.data['roles'];

    if (role && expectedRoles?.includes(role)) {
      return true;
    }

    this.router.navigate(['/login']);

    return false;
  }
}
