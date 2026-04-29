import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth/auth-service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Languageswitcher } from '../../shared/components/languageswitcher/languageswitcher';
@Component({
  selector: 'app-header',
  imports: [MatButtonModule , MatMenuModule, CommonModule,
     ReactiveFormsModule, FormsModule, Languageswitcher],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {

  clients: any[] = [];
  selectedClient: any = null;

  constructor(private auth: AuthService){}
  
  // ngOnInit(): void {
  //   this.auth.clients$.subscribe(clients => this.clients = clients);
  //   this.auth.currentClient$.subscribe(client => this.selectedClient = client);   
  // }
  
// ngOnInit(): void {
//   this.auth.clients$.subscribe(clients => {
//     if (!clients || clients.length === 0) {
//       this.clients = [
//         { id: '1', name: 'Test Client 1' },
//         { id: '2', name: 'Test Client 2' },
//         { id: '3', name: 'Test Client 3' }
//       ];

//       this.selectedClient = this.clients[0].id;
//     } else {
//       this.clients = clients;
//       this.selectedClient = clients[0]?.id;
//     }
//   });
// }
ngOnInit(): void {
  this.auth.clients$.subscribe(clients => {

    if (!clients || clients.length === 0) {
      this.clients = [
        { id: '1', name: 'Test Client 1' },
        { id: '2', name: 'Test Client 2' },
        { id: '3', name: 'Test Client 3' }
      ];
    } else {
      this.clients = clients;
    }

    if (!this.selectedClient) {
      this.selectedClient = this.clients[0].id;
      this.auth.switchClient(this.selectedClient);
    }
  });
}

  onClientChange(client: any){
    this.auth.switchClient(client);
  }

}
