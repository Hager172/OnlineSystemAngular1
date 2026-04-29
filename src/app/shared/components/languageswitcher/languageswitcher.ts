// import { Component, OnInit } from '@angular/core';
// import { Language } from '../../../core/services/language/language';

// @Component({
//   selector: 'app-languageswitcher',
//   imports: [],
//   templateUrl: './languageswitcher.html',
//   styleUrl: './languageswitcher.css',
// })
// export class Languageswitcher implements OnInit {

//   currentLang!: 'en' | 'ar';

//   constructor(private langService: Language) {}

//   ngOnInit(): void {
//     this.currentLang = this.langService.getLanguage();
//   }

//   toggleLang() {
//     this.currentLang = this.currentLang === 'en' ? 'ar' : 'en';
//     this.langService.setLanguage(this.currentLang);
//   }

// }
import { Component, Inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type Language = 'en' | 'ar';

@Component({
  selector: 'app-languageswitcher',
  imports: [],
  templateUrl: './languageswitcher.html',
  styleUrl: './languageswitcher.css',
})
export class Languageswitcher {
  constructor(
    private transloco: TranslocoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  changeLanguage(lang: Language) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.transloco.setActiveLang(lang);
    localStorage.setItem('language', lang);

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}