import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';

import { OnlineApprovalsReportService } from '../services/online-approvals-report.service';
import { ApprovalReportDto, ReportStats, StatCard } from '../models/approval-report.model';

// ─── Validator ────────────────────────────────────────────────────────────────
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as Date | null;
  const end   = group.get('endDate')?.value as Date | null;
  if (start && end && new Date(start) > new Date(end)) {
    return { dateRange: true };
  }
  return null;
}

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

// ─── Component ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-online-approvals-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatMenuModule,
    MatDividerModule,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
  ],
  templateUrl: './online-approvals-report.component.html',
  styleUrl: './online-approvals-report.component.scss',
})
export class OnlineApprovalsReportComponent implements OnInit, AfterViewInit {

  // ── ViewChildren ─────────────────────────────────────────────────────────
  @ViewChild(MatSort) set matSort(sort: MatSort) {
    if (sort) this.dataSource.sort = sort;
  }
  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator) {
    if (p) this.dataSource.paginator = p;
  }

  // ── DI ───────────────────────────────────────────────────────────────────
  private readonly service    = inject(OnlineApprovalsReportService);
  private readonly fb         = inject(FormBuilder);
  private readonly snackBar   = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // ── State signals ─────────────────────────────────────────────────────────
  loading      = signal(false);
  error        = signal<string | null>(null);
  hasLoaded    = signal(false);
  data         = signal<ApprovalReportDto[]>([]);
  globalFilter = signal('');

  stats     = computed<ReportStats>(() => this.calcStats(this.data()));
  statCards = computed<StatCard[]>(() => this.buildCards(this.stats()));

  // ── Table ────────────────────────────────────────────────────────────────
  readonly allColumns  = COLUMN_DEFS;
  readonly dataSource  = new MatTableDataSource<ApprovalReportDto>([]);
  readonly skeletonRows = Array(6).fill(0);
  readonly skeletonCols = Array(7).fill(0);

  visibleKeys = signal<string[]>(COLUMN_DEFS.map(c => c.key));
  get displayedColumns(): string[] { return this.visibleKeys(); }

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly form: FormGroup = this.fb.group(
    {
      clientId:  ['', Validators.required],
      startDate: [null as Date | null, Validators.required],
      endDate:   [null as Date | null, Validators.required],
    },
    { validators: dateRangeValidator }
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.restoreFilters();
    this.dataSource.filterPredicate = this.buildFilterPredicate();
  }

  ngAfterViewInit(): void { /* sort/paginator set via ViewChild setters */ }

  // ── Actions ───────────────────────────────────────────────────────────────
  search(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { clientId, startDate, endDate } = this.form.value as {
      clientId: string; startDate: Date; endDate: Date;
    };
    this.persistFilters(clientId, startDate, endDate);
    this.load(clientId, startDate, endDate);
  }

  reset(): void {
    this.form.reset();
    this.data.set([]);
    this.dataSource.data = [];
    this.error.set(null);
    this.hasLoaded.set(false);
    this.onGlobalFilter('');
    sessionStorage.removeItem(SESSION_KEY);
  }

  refresh(): void {
    if (this.form.valid) this.search();
  }

  onGlobalFilter(value: string): void {
    this.globalFilter.set(value);
    this.dataSource.filter = value.trim().toLowerCase();
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
  getStatusKey(status: string): string {
    const map: Record<string, string> = {
      approved: 'approved', pending: 'pending',
      rejected: 'rejected', cancelled: 'cancelled',
    };
    return map[status?.toLowerCase()] ?? 'unknown';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      approved: 'check_circle', pending: 'schedule',
      rejected: 'cancel',       cancelled: 'block',
    };
    return map[status?.toLowerCase()] ?? 'help_outline';
  }

  trackByApproval = (_: number, row: ApprovalReportDto): number => row.approvalId;

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
  private load(clientId: string, start: Date, end: Date): void {
    this.loading.set(true);
    this.error.set(null);

    this.service
      .getOnlineApprovalsReport(clientId, start, end)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => {
          this.data.set(rows);
          this.dataSource.data = rows;
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

  private buildCards(s: ReportStats): StatCard[] {
    return [
      { title: 'Total Approvals',   value: s.total,            icon: 'assignment',      colorClass: 'oar-sc--blue',    subtitle: 'All records',        isCurrency: false },
      { title: 'Total Value',       value: s.totalValue,       icon: 'payments',        colorClass: 'oar-sc--green',   subtitle: 'Sum of values',      isCurrency: true  },
      { title: 'Average Value',     value: s.avgValue,         icon: 'show_chart',      colorClass: 'oar-sc--violet',  subtitle: 'Per approval',       isCurrency: true  },
      { title: 'Approved',          value: s.approved,         icon: 'check_circle',    colorClass: 'oar-sc--emerald', subtitle: 'Approved count',     isCurrency: false },
      { title: 'Rejected',          value: s.rejected,         icon: 'cancel',          colorClass: 'oar-sc--red',     subtitle: 'Rejected count',     isCurrency: false },
      { title: 'Pending',           value: s.pending,          icon: 'schedule',        colorClass: 'oar-sc--amber',   subtitle: 'Awaiting decision',  isCurrency: false },
      { title: 'Total Coinsurance', value: s.totalCoinsurance, icon: 'account_balance', colorClass: 'oar-sc--cyan',    subtitle: 'Sum of coinsurance', isCurrency: true  },
    ];
  }

  private buildFilterPredicate(): (row: ApprovalReportDto, filter: string) => boolean {
    return (row, filter) =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(filter));
  }

  private buildCsv(): string {
    const header = COLUMN_DEFS.map(c => `"${c.label}"`).join(',');
    const rows   = this.dataSource.filteredData.map(r =>
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

  private persistFilters(clientId: string, start: Date, end: Date): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      clientId,
      startDate: start.toISOString(),
      endDate:   end.toISOString(),
    }));
  }

  private restoreFilters(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as { clientId?: string; startDate?: string; endDate?: string };
      this.form.patchValue({
        clientId:  s.clientId  ?? '',
        startDate: s.startDate ? new Date(s.startDate) : null,
        endDate:   s.endDate   ? new Date(s.endDate)   : null,
      });
    } catch { /* ignore malformed storage */ }
  }
}
