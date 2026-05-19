import { ApplicationConfig, isDevMode, PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { isPlatformBrowser } from '@angular/common';
import { routes } from './app.routes';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TokenInterceptor } from './core/interceptors/TokenInterceptor';

export function getDefaultLang(platformId: Object): string {
  if (isPlatformBrowser(platformId)) {
    return localStorage.getItem('language') || 'en';
  }
  return 'en'; // fallback للـ SSR
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
 {
    provide: HTTP_INTERCEPTORS,
    useClass: TokenInterceptor,
    multi: true
  },
    provideTransloco({
      config: {
        availableLangs: ['en', 'ar'],
        defaultLang: getDefaultLang(PLATFORM_ID as any),
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
