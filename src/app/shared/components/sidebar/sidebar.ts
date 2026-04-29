import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth/auth-service';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit{
  currentClient: string | null = null;
  constructor(private auth: AuthService){}
  ngOnInit(): void {
    this.auth.currentClient$.subscribe(clientId =>{
      this.currentClient = clientId;
      this.loadSidebarData();
    });
  }

  loadSidebarData(){
    //المفروض هنا اكلم api اجيب منه الداتا اللي هتبقي موجودة في السايد حسب 
    //الكلاينت اللي داخل دا مسموحله يشوف اي
  }

}
