import {
  Component,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth/auth-service';

/** Shape we rely on for a navigation page. All fields are optional except a name. */
interface NavPage {
  nameEn?: string;
  nameAr?: string;
  icon?: string;
  route?: string;
  url?: string;
  children?: NavPage[];
}
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule,RouterLink, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  currentLang: 'en' | 'ar' = 'en';

  /** Off-canvas drawer state on mobile/tablet. */
  isMobileOpen = false;

  /** Mini icon-rail state on desktop. Persisted across reloads. */
  isCollapsed = false;

  /** Currently highlighted page (for items that don't carry a router route). */
  activePage: NavPage | null = null;

  /** Expanded submenu groups. */
  private readonly expanded = new Set<NavPage>();

  private readonly storageKey = 'sidebar:collapsed';
currentRole: string | null = '';
  constructor(
    public auth: AuthService, // public so the template can read auth.pages$
    private transloco: TranslocoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.currentLang = (this.transloco.getActiveLang() as 'en' | 'ar') || 'en';
    this.transloco.langChanges$.subscribe((lang) => {
      this.currentLang = (lang as 'en' | 'ar') || 'en';
    });

    if (isPlatformBrowser(this.platformId)) {
      this.isCollapsed = localStorage.getItem(this.storageKey) === '1';
    }
  }

 get isRtl(): boolean {
  this.auth.role$.subscribe(role => {
this.currentRole = role ? role.toUpperCase() : '';    });

console.log('Current Role:', this.currentRole);
    return this.currentLang === 'ar';

  }


  getPageName(page: NavPage): string {
    const name = this.isRtl ? page?.nameAr : page?.nameEn;
    return name || page?.nameEn || page?.nameAr || '';
  }

  getPageIcon(page: NavPage): string {
    if (page?.icon) {
      return page.icon.startsWith('fa') ? page.icon : `fas fa-${page.icon}`;
    }
    return page?.children?.length ? 'fas fa-layer-group' : 'fas fa-circle-dot';
  }

  getRoute(page: NavPage): string | null {
    const route = page?.route || page?.url || null;
    if (!route) return null;
    return route.startsWith('/') ? route : `/${route}`;
  }

  hasChildren(page: NavPage): boolean {
    return !!page?.children?.length;
  }

  isExpanded(page: NavPage): boolean {
    return this.expanded.has(page);
  }

  isActive(page: NavPage): boolean {
    return this.activePage === page;
  }

  toggleSubmenu(page: NavPage, event?: Event): void {
    event?.preventDefault();
    if (this.isCollapsed) {
      // In mini mode, expanding a group first restores the full rail.
      this.isCollapsed = false;
      this.persistCollapsed();
    }
    if (this.expanded.has(page)) {
      this.expanded.delete(page);
    } else {
      this.expanded.add(page);
    }
  }

  selectPage(page: NavPage): void {
    this.activePage = page;
    this.closeMobile();
  }

  // ---- responsive controls -------------------------------------------------

  toggleMobile(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeMobile(): void {
    this.isMobileOpen = false;
  }

  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
    this.persistCollapsed();
  }

  private persistCollapsed(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey, this.isCollapsed ? '1' : '0');
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobile();
  }

  trackByPage = (_: number, page: NavPage): string =>
    (page?.nameEn || '') + '|' + (page?.nameAr || '');
}
