import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Render on the server on demand instead of prerendering at build time.
  // Routes depend on a running backend (HTTP API, translations, SignalR),
  // which isn't available during the build, so static prerendering times out.
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
