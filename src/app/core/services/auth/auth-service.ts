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


 
constructor(
  private http: HttpClient,
  @Inject(PLATFORM_ID) private platformId: Object
) {

  if (isPlatformBrowser(this.platformId)) {

    const clients = localStorage.getItem('clients');
    const currentClient = localStorage.getItem('currentClient');
    const user = localStorage.getItem('user');

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
  }
}
  login(userName: string , password: string){
    return this.http.post<any>(this.apiUrl+'Account/login',{userName , password})
    .pipe(
      tap(res=>{
     
        this.saveAuthData(res.data);

      
        this.clientsSubject.next(res.data.clients || []);

        this.pagesSubject.next(res.data.pages || []);

        // this.currentClientSubject.next(
        //   res.data.clientId ?? '1'
        // );

        this.currentClientSubject.next(res.data.clientId || null);
      })
    );
  }

private saveAuthData(data: any){
  if(isPlatformBrowser(this.platformId)){
    console.log('vendor id:' ,data.vendorId );
    console.log('token:' ,data.authToken );
    localStorage.setItem('vendorid',data.vendorId);
     localStorage.setItem('clients', JSON.stringify(data.clients || []));
  localStorage.setItem('currentClient', data.clientId ?? '');
    localStorage.setItem('token' , data.authToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify({
      username: data.username,
      vendorId: data.vendorId,     
      pages: data.pages
    }));
  }
}
// setPages(pages: any[]) {
//   this.pagesSubject.next([...pages]);
// }
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
// switchClient(clientId: string) {

//   this.currentClientSubject.next(clientId);

//   if (isPlatformBrowser(this.platformId)) {

//     localStorage.setItem('currentClient', clientId.toString());

//     const user = JSON.parse(localStorage.getItem('user') || '{}');
//     this.http.
   
//   }

  
// }

// /Account/SwitchClients?ClientId=3
// switchClient(clientId: string) {
//   console.log("fun");
//   return this.http.post<any>(
//     `${this.apiUrl}Account/SwitchClients?ClientId=${clientId}`, {}
//   ).pipe(
//     tap(res => {
//       console.log("test", res);
//       const newToken = res.data.authToken;
//       localStorage.setItem('token', newToken);
//       this.currentClientSubject.next(clientId);
//     }),
//     switchMap(() =>
//       this.http.get<any>(`${this.apiUrl}Account/Me`)
//     ),
//     tap(res => {
//       const data = res.data;
//       this.pagesSubject.next(data.pages || []);

//       if (isPlatformBrowser(this.platformId)) {
//         const user = JSON.parse(localStorage.getItem('user') || '{}');
//         user.pages = data.pages;
//         localStorage.setItem('user', JSON.stringify(user));
//       }
//     })
//   );
// }
// switchClient(clientId: string) {
//   this.http.post<any>(
//     `${this.apiUrl}Account/SwitchClients?ClientId=${clientId}`, {}
//   ).subscribe(res => {
// console.log("data",res);
//     const newToken = res.data.authToken;
//     localStorage.setItem('token', newToken);
//     this.currentClientSubject.next(clientId);

//     this.http.get<any>(`${this.apiUrl}Account/Me`)
//       .subscribe(res2 => {
//         console.log("data2",res2);
//         const data = res2;
//         this.pagesSubject.next(data.pages || []);
//       });
//   });
// }

switchClient(clientId: string):Observable<any>{
 return this.http.post<any>(
    `${this.apiUrl}Account/SwitchClients?ClientId=${clientId}`, {}
  )
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
