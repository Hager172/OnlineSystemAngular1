import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenKey = 'auth_token';

  private clientsSubject = new BehaviorSubject<any[]>([]);
  clients$ = this.clientsSubject.asObservable();

  public currentClientSubject = new BehaviorSubject< string | null>(null);
  currentClient$ = this.currentClientSubject.asObservable();
  
  private pagesSubject = new BehaviorSubject<any[]>([]);
  pages$ = this.pagesSubject.asObservable();

  private apiUrl = environment.apiUrl;

private roleSubject = new BehaviorSubject<string | null>(null);
  role$ = this.roleSubject.asObservable();
 
constructor(
  private http: HttpClient,
  @Inject(PLATFORM_ID) private platformId: Object
) {

  if (isPlatformBrowser(this.platformId)) {

    const clients = localStorage.getItem('clients');
    const currentClient = localStorage.getItem('currentClient');
    const user = localStorage.getItem('user');
const role = localStorage.getItem('role');
    if (clients) {
      this.clientsSubject.next(JSON.parse(clients));
    }

    if (currentClient) {
      this.currentClientSubject.next(currentClient);
    }

    if (user) {
      const parsed = JSON.parse(user);
      console.log("pages",parsed.pages);
      this.pagesSubject.next(parsed.pages || []);
    }
    if (role) this.roleSubject.next(role);
  }
}
  login(userName: string , password: string){
    return this.http.post<any>(this.apiUrl+'Account/login',{userName , password})
    .pipe(
      tap(res=>{
     
        this.saveAuthData(res.data);

      
        this.clientsSubject.next(res.data.clients || []);

        this.pagesSubject.next(res.data.pages || []);

    

        this.currentClientSubject.next(res.data.clientId || null);
      })
    );
  }

private saveAuthData(data: any){
  if(isPlatformBrowser(this.platformId)){
    localStorage.setItem('vendorid',data.vendorId);
    localStorage.setItem('branchid', data.branchId);
     localStorage.setItem('clients', JSON.stringify(data.clients || []));
  localStorage.setItem('currentClient', data.clientId ?? '');
    localStorage.setItem('token' , data.authToken);
  const userRole = data.roles[0];
      localStorage.setItem('role', userRole);
      this.roleSubject.next(userRole);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify({
      username: data.username,
      vendorId: data.vendorId, 
      branchId: data.branchId,    
      pages: data.pages,
      role: userRole
    }));
  }
}
getBranchId(): string | null {
  if (isPlatformBrowser(this.platformId)) {
    return localStorage.getItem('branchid');
  }
  return null;
}
setPages(pages: any[]) {
  this.pagesSubject.next([...pages]);

  if (isPlatformBrowser(this.platformId)) {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      user.pages = pages; 
      localStorage.setItem('user', JSON.stringify(user));
    }
  }
}

updateSessionData(vendorId: string, branchId: string, role?: string) {
    if (isPlatformBrowser(this.platformId)) {
      if (vendorId) localStorage.setItem('vendorid', vendorId);
      if (branchId) localStorage.setItem('branchid', branchId);
      if (role) {
        localStorage.setItem('role', role);
        this.roleSubject.next(role);
      }

      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.vendorId = vendorId || user.vendorId;
        user.branchId = branchId || user.branchId;
        user.role = role || user.role;
        localStorage.setItem('user', JSON.stringify(user));
      }
    }
  }

  getRole(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('role');
    }
    return this.roleSubject.value;
  }

switchClient(userId:any, clientId:any){
  return this.http.post<any>(
    `${this.apiUrl}Account/SwitchClients?UserId=${userId}&ClientId=${clientId}`,
    {}
  );
}

me():Observable<any>{
 return this.http.get<any>(`${this.apiUrl}Account/Me`);
}

getVendorId(): string | null {
  if (isPlatformBrowser(this.platformId)) {
    return localStorage.getItem('vendorid');
  }
  return null;
}
getclientid():string|null{
    if (isPlatformBrowser(this.platformId)) {
    return localStorage.getItem('currentClient');
  }
  return null;
}
 getToken(){
  if (isPlatformBrowser(this.platformId)) {
    return localStorage.getItem('token');
  }
  return null;
}


  logout(){
  if (isPlatformBrowser(this.platformId)) {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  this.currentClientSubject.next(null);
  this.pagesSubject.next([]);
}

  
}
