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
  currentLang: Language = 'en';

  constructor(
    private transloco: TranslocoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('language') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'ar')) {
        this.currentLang = savedLang;
        this.transloco.setActiveLang(savedLang);
        document.documentElement.lang = savedLang;
        document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
      }
    }
  }

  changeLanguage(lang: Language) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentLang = lang;
    this.transloco.setActiveLang(lang);
    localStorage.setItem('language', lang);

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}