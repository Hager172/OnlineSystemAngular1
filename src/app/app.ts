import {Component, signal, OnInit, Inject, PLATFORM_ID, inject} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';

type Language = 'en' | 'ar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('Online System');

  private transloco = inject(TranslocoService);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const lang = (localStorage.getItem('language') as Language) || 'en';

      this.transloco.setActiveLang(lang);
      this.applyDirection(lang);
    }
  }

  changeLanguage(lang: Language) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.transloco.setActiveLang(lang);
    localStorage.setItem('language', lang);
    this.applyDirection(lang);
  }

  private applyDirection(lang: Language) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }



  // constructor(
  //   private translate: TranslateService,
  //   @Inject(PLATFORM_ID) private platformId: Object
  // ) {
  //   this.translate.setDefaultLang('en');

  //   if (isPlatformBrowser(this.platformId)) {
  //     const savedLang = localStorage.getItem('lang') || 'en';
  //     this.translate.use(savedLang);
  //   }
  // }

}
