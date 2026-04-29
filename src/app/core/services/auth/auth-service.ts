import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
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

  private currentClientSubject = new BehaviorSubject< string | null>(null);
  currentClient$ = this.currentClientSubject.asObservable();
  
  private pagesSubject = new BehaviorSubject<any[]>([]);
  pages$ = this.pagesSubject.asObservable();

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient , 
    @Inject(PLATFORM_ID) private platformId: Object
  ){}

  login(userName: string , password: string){
    return this.http.post<any>(this.apiUrl+'Account/login',{userName , password})
    .pipe(
      tap(res=>{
        // this.saveAuthData(res.data);
         
        // this.clientsSubject.next(res.data.clients || []);

        // if(res.data.clients && res.data.clients.length > 0){
        // this.currentClientSubject.next(res.defultClient);
        // }
        this.saveAuthData(res.data);

        // clients (null حالياً)
        this.clientsSubject.next(res.data.clients || []);

        this.pagesSubject.next(res.data.pages || []);

        this.currentClientSubject.next(
          res.data.ClientId ?? '1'
        );
      })
    );
  }

private saveAuthData(data: any){
  if(isPlatformBrowser(this.platformId)){
    console.log('vendor id:' ,data.vendorId );
    console.log('token:' ,data.authToken );
    localStorage.setItem('token' , data.authToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify({
      username: data.username,
      vendorId: data.vendorId,     
      pages: data.pages
    }));
  }
}

  switchClient(clientId: string){
    this.currentClientSubject.next(clientId);
    if (isPlatformBrowser(this.platformId)) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.pagesSubject.next(user.pages || []);
      // call api: /pages?clientId=xxx
    }
  }

 getToken(){
  if (isPlatformBrowser(this.platformId)) {
    return localStorage.getItem(this.tokenKey);
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
