import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth/auth-service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Languageswitcher } from '../../shared/components/languageswitcher/languageswitcher';
import Swal from 'sweetalert2';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-header',
  imports: [MatButtonModule , MatMenuModule, CommonModule,
     ReactiveFormsModule, FormsModule, Languageswitcher,RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {

  clients: any[] = [];
  selectedClient: any = null;
  isClientDropdownOpen = false;

  /** Maps a clientId to its company logo. Replace these files with the
   *  official assets at the same paths to change the displayed logos. */
  private readonly clientLogos: Record<number, string> = {
    2: 'assets/logos/mashreq.svg',
    3: 'assets/logos/medigold.svg',
  };

  constructor(private auth: AuthService, private elRef: ElementRef){

  }

  getClientLogo(clientId: any): string | null {
    return this.clientLogos[Number(clientId)] ?? null;
  }

  isSelected(client: any): boolean {
    return String(client?.clientId) === String(this.selectedClient);
  }

  get selectedClientObj(): any {
    return this.clients?.find(c => this.isSelected(c)) ?? null;
  }

  toggleClientDropdown(): void {
    this.isClientDropdownOpen = !this.isClientDropdownOpen;
  }

  selectClient(client: any): void {
    this.isClientDropdownOpen = false;
    if (this.isSelected(client)) {
      return;
    }
    this.selectedClient = client.clientId;
    this.onClientChange(client.clientId);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isClientDropdownOpen && !this.elRef.nativeElement.contains(event.target)) {
      this.isClientDropdownOpen = false;
    }
  }
  

ngOnInit(): void {
  this.auth.clients$.subscribe(clients => {
console.log("clients",clients);

    this.clients = clients;
  });
this.selectedClient = this.auth.currentClientSubject.value;
  
  // ولو اتغير في أي وقت، نحدث الـ Variable المحلي
  this.auth.currentClient$.subscribe(id => {
    this.selectedClient = id;
  });
  // this.auth.currentClient$.subscribe(clientId => {
  //   console.log("khdf",clientId)
  //   this.selectedClient = clientId;
  // });

}

//   onClientChange(client: any){
//     console.log(client);
//     this.auth.switchClient(client).subscribe({next:(res)=>{
//        console.log("data",res);
//     const newToken = res.data.authToken;
//     localStorage.setItem('token', newToken);
// this.auth.currentClientSubject.next(res.clientId);
// localStorage.setItem('currentClient', res.clientId); 

//  this.auth.me().subscribe(user => {

//       this.auth.setPages(user.pages); // 👈 مهم جدًا
//     });
//     }});
//   }
onClientChange(clientId: any) {
  this.auth.switchClient(clientId).subscribe({
    next: (res) => {
      const newToken = res.data.authToken;
      localStorage.setItem('token', newToken);
      localStorage.setItem('currentClient', clientId);
      this.auth.currentClientSubject.next(clientId);

      this.auth.me().subscribe({
        next: (resMe) => {
          const updatedPages = resMe.data?.pages || resMe.pages || [];
          
          this.auth.setPages(updatedPages);
        }
      });
    }
  });
}
// onClientChange(clientId: any) {
//   this.auth.switchClient(clientId).subscribe({
//     next: (res) => {
//       const newToken = res.data.authToken;
//       localStorage.setItem('token', newToken);
//       localStorage.setItem('currentClient', clientId); 

//       this.auth.me().subscribe(user => {
//         const pages = user.data?.pages || user.pages;
        
//         const userData = JSON.parse(localStorage.getItem('user') || '{}');
//         userData.pages = pages;
//         localStorage.setItem('user', JSON.stringify(userData));

//         this.auth.currentClientSubject.next(clientId);
//         this.auth.setPages(pages);
//       });
//     }
//   });
// }
}
