// import { Component, OnInit } from '@angular/core';
// import { AuthService } from '../../core/services/auth/auth-service';
// import { CommonModule } from '@angular/common';
// import { ReactiveFormsModule } from '@angular/forms';

// @Component({
//   selector: 'app-sidebar',
//   imports: [CommonModule, ReactiveFormsModule],
//   templateUrl: './sidebar.html',
//   styleUrl: './sidebar.css',
// })
// export class Sidebar implements OnInit{
//   currentClient: string | null = null;
//   pages: any[] = [];

//   constructor(private auth: AuthService){} 
//   // ngOnInit(): void {
//   //   this.auth.currentClient$.subscribe(clientId =>{
//   //     this.currentClient = clientId;
//   //     this.loadSidebarData();
//   //   });
//   // }
//    ngOnInit(): void {
//     this.auth.pages$.subscribe(pages => {
//       console.log('SIDEBAR PAGES:', pages); 
//       this.pages = pages;
//     });
//   }

//   loadSidebarData(){
//     //المفروض هنا اكلم api اجيب منه الداتا اللي هتبقي موجودة في السايد حسب 
//     //الكلاينت اللي داخل دا مسموحله يشوف اي
//   }

// }

// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { AuthService } from '../../core/services/auth/auth-service';
// import { CommonModule } from '@angular/common';
// import { ReactiveFormsModule } from '@angular/forms';
// import { TranslocoService } from '@jsverse/transloco';
// import { Subscription } from 'rxjs';
// import { ChangeDetectorRef } from '@angular/core';
// @Component({
//   selector: 'app-sidebar',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule],
//   templateUrl: './sidebar.html',
//   styleUrl: './sidebar.css',
// })
// export class Sidebar implements OnInit, OnDestroy {
//   pages: any[] = [];
//   currentLang: 'en' | 'ar' = 'en';

//   private sub = new Subscription();

//   constructor(
//     private auth: AuthService,
//     private transloco: TranslocoService,
//     private cdr: ChangeDetectorRef
//   ) {}

//   ngOnInit(): void {
//     this.sub.add(
//       this.auth.pages$.subscribe(pages => {
//         this.pages = pages || [];
//          console.log('SIDEBAR PAGES:', pages); 
//          this.cdr.detectChanges();
//       })
//     );

//     this.currentLang = this.transloco.getActiveLang() as 'en' | 'ar';

//     this.sub.add(
//       this.transloco.langChanges$.subscribe(lang => {
//         this.currentLang = lang as 'en' | 'ar';
//       })
//     );
//   }

//   getPageName(page: any): string {

//     return this.currentLang === 'ar'
//       ? page.nameAr
//       : page.nameEn;
//   }

//   ngOnDestroy(): void {
//     this.sub.unsubscribe();
//   }
// }
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth/auth-service';
import { CommonModule } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule], // أضف AsyncPipe لو مش موجود في CommonModule
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  currentLang: 'en' | 'ar' = 'en';

  constructor(
    public auth: AuthService, // لازم public عشان الـ HTML يشوفها
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.currentLang = this.transloco.getActiveLang() as 'en' | 'ar';
    this.transloco.langChanges$.subscribe(lang => {
      this.currentLang = lang as 'en' | 'ar';
    });
  }

  getPageName(page: any): string {
    return this.currentLang === 'ar' ? page.nameAr : page.nameEn;
  }
}