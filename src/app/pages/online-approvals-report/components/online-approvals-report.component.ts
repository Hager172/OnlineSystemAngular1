import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { OnlineApprovalsReportService } from '../services/online-approvals-report.service';
import { ApprovalReportDto, ReportStats } from '../models/approval-report.model';
import { AuthService } from '../../../core/services/auth/auth-service';

// ─── Column definitions ────────────────────────────────────────────────────────
const COLUMN_DEFS = [
  { key: 'formId',         label: 'Form ID'      },
  { key: 'approvalId',     label: 'Approval ID'  },
  { key: 'memberId',       label: 'Member ID'    },
  { key: 'empName',        label: 'Employee'     },
  { key: 'customerName',   label: 'Customer'     },
  { key: 'provName',       label: 'Provider'     },
  { key: 'branchName',     label: 'Branch'       },
  { key: 'approvalDate',   label: 'Approval Date'},
  { key: 'value',          label: 'Value'        },
  { key: 'coinsurance',    label: 'Coinsurance'  },
  { key: 'onlineStatus',   label: 'Status'       },
  { key: 'notes',          label: 'Notes'        },
  { key: 'lastUpdateDate', label: 'Last Updated' },
  { key: 'lastUpdateBy',   label: 'Updated By'   },
  { key: 'onlineLud',      label: 'Online LUD'   },
] as const;

const SESSION_KEY = 'oar-filters';
const DATE_COLUMNS = ['approvalDate', 'lastUpdateDate', 'onlineLud'];

// ─── Component ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-online-approvals-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './online-approvals-report.component.html',
  styleUrl: './online-approvals-report.component.scss',
})
export class OnlineApprovalsReportComponent implements OnInit {

  // ── DI ───────────────────────────────────────────────────────────────────
  private readonly service    = inject(OnlineApprovalsReportService);
  private readonly snackBar   = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth       = inject(AuthService);

  // ── State signals ─────────────────────────────────────────────────────────
  loading      = signal(false);
  error        = signal<string | null>(null);
  hasLoaded    = signal(false);
  data         = signal<ApprovalReportDto[]>([]);
  globalFilter = signal('');

  // filters (yyyy-MM-dd strings for the date inputs)
  startDate = signal<string>('');
  endDate   = signal<string>('');
  formError = signal<string>('');

  // sorting / paging
  sortColumn    = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  currentPage   = signal(1);
  itemsPerPage  = 10;
  Math = Math;

  readonly allColumns = COLUMN_DEFS;
  visibleKeys = signal<string[]>(COLUMN_DEFS.map(c => c.key));

  stats = computed<ReportStats>(() => this.calcStats(this.data()));

  // ── Derived data (filter → sort) ──────────────────────────────────────────
  filteredData = computed<ApprovalReportDto[]>(() => {
    let all = this.data();
    const q = this.globalFilter().trim().toLowerCase();
    if (q) {
      all = all.filter(row =>
        Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    const col = this.sortColumn();
    if (col) {
      const dir = this.sortDirection();
      all = [...all].sort((a, b) => {
        let x: any = a[col as keyof ApprovalReportDto];
        let y: any = b[col as keyof ApprovalReportDto];
        if (DATE_COLUMNS.includes(col)) {
          x = x ? new Date(x).getTime() : 0;
          y = y ? new Date(y).getTime() : 0;
        } else if (typeof x === 'string' || typeof y === 'string') {
          x = String(x ?? '').toLowerCase();
          y = String(y ?? '').toLowerCase();
        } else {
          x = x ?? 0;
          y = y ?? 0;
        }
        if (x < y) return dir === 'asc' ? -1 : 1;
        if (x > y) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return all;
  });

  currentItems = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredData().slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() => Math.ceil(this.filteredData().length / this.itemsPerPage) || 1);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.restoreFilters();
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  search(): void {
    this.formError.set('');
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) {
      this.formError.set('Start date and end date are required.');
      return;
    }
    if (new Date(start) > new Date(end)) {
      this.formError.set('Start date must be before end date.');
      return;
    }
    const clientId = this.auth.getclientid();
    if (!clientId) {
      const msg = 'No client is selected. Please log in again.';
      this.error.set(msg);
      this.snackBar.open(msg, 'Dismiss', { duration: 6000, panelClass: ['oar-snack-error'] });
      return;
    }
    this.persistFilters(start, end);
    this.load(clientId, start, end);
  }

  reset(): void {
    this.startDate.set('');
    this.endDate.set('');
    this.formError.set('');
    this.data.set([]);
    this.error.set(null);
    this.hasLoaded.set(false);
    this.onGlobalFilter('');
    this.currentPage.set(1);
    sessionStorage.removeItem(SESSION_KEY);
  }

  refresh(): void {
    if (this.startDate() && this.endDate()) this.search();
  }

  onGlobalFilter(value: string): void {
    this.globalFilter.set(value);
    this.currentPage.set(1);
  }

  // ── Sorting / paging ──────────────────────────────────────────────────────
  sort(col: string): void {
    if (this.sortColumn() === col) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  getSortIcon(col: string): string {
    if (this.sortColumn() !== col) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  changePage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  getPagesArray(): number[] {
    const total = this.totalPages(), current = this.currentPage(), max = 5;
    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, current - Math.floor(max / 2));
    let end = start + max - 1;
    if (end > total) { end = total; start = end - max + 1; }
    return Array.from({ length: max }, (_, i) => start + i);
  }

  // ── Column chooser ────────────────────────────────────────────────────────
  toggleColumn(key: string): void {
    const orderedKeys = COLUMN_DEFS.map(c => c.key);
    const current = this.visibleKeys();
    const next = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key];
    this.visibleKeys.set(orderedKeys.filter(k => next.includes(k)));
  }

  isColumnVisible(key: string): boolean {
    return this.visibleKeys().includes(key);
  }

  // ── Status helpers ────────────────────────────────────────────────────────
  statusPillClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':  return 'st-approved';
      case 'pending':   return 'st-pending';
      case 'rejected':
      case 'cancelled': return 'st-rejected';
      default:          return 'st-review';
    }
  }

  // ── Export / Print ────────────────────────────────────────────────────────
  exportCsv(): void {
    this.download(this.buildCsv(), 'online-approvals.csv', 'text/csv;charset=utf-8;');
  }

  exportExcel(): void {
    this.download('﻿' + this.buildCsv(), 'online-approvals.csv', 'application/vnd.ms-excel');
  }

  print(): void {
    window.print();
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private load(clientId: string, start: string, end: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.service
      .getOnlineApprovalsReport(clientId, new Date(start), new Date(end))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => {
          this.data.set(rows);
          this.currentPage.set(1);
          this.hasLoaded.set(true);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          const e = err as { error?: { message?: string }; message?: string };
          const msg = e?.error?.message ?? e?.message ?? 'Failed to load report. Please try again.';
          this.error.set(msg);
          this.loading.set(false);
          this.snackBar.open(msg, 'Dismiss', {
            duration: 6000,
            panelClass: ['oar-snack-error'],
          });
        },
      });
  }

  private calcStats(rows: ApprovalReportDto[]): ReportStats {
    const total         = rows.length;
    const totalValue    = rows.reduce((s, r) => s + (r.value ?? 0), 0);
    const totalCoins    = rows.reduce((s, r) => s + (r.coinsurance ?? 0), 0);
    const lc            = (s: string) => s?.toLowerCase() ?? '';
    return {
      total,
      totalValue,
      avgValue:         total ? totalValue / total : 0,
      approved:         rows.filter(r => lc(r.onlineStatus) === 'approved').length,
      rejected:         rows.filter(r => lc(r.onlineStatus) === 'rejected').length,
      pending:          rows.filter(r => lc(r.onlineStatus) === 'pending').length,
      cancelled:        rows.filter(r => lc(r.onlineStatus) === 'cancelled').length,
      totalCoinsurance: totalCoins,
    };
  }

  private buildCsv(): string {
    const header = COLUMN_DEFS.map(c => `"${c.label}"`).join(',');
    const rows   = this.filteredData().map(r =>
      [
        r.formId, r.approvalId, r.memberId, r.empName, r.customerName,
        r.provName, r.branchName, r.approvalDate, r.value ?? '',
        r.coinsurance ?? '', r.onlineStatus, r.notes,
        r.lastUpdateDate, r.lastUpdateBy, r.onlineLud ?? '',
      ]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    return [header, ...rows].join('\n');
  }

  private download(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }

  private persistFilters(start: string, end: string): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      startDate: new Date(start).toISOString(),
      endDate:   new Date(end).toISOString(),
    }));
  }

  private restoreFilters(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as { startDate?: string; endDate?: string };
      const toInput = (iso?: string) => (iso ? iso.split('T')[0] : '');
      this.startDate.set(toInput(s.startDate));
      this.endDate.set(toInput(s.endDate));
    } catch { /* ignore malformed storage */ }
  }
}
