import { Component, OnInit, signal, computed } from '@angular/core';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../core/services/auth/auth-service';
import { RouterLink } from '@angular/router';
import { PopupService } from '../../../core/services/popup/popup-service';
import { InvoicePrintService } from '../../../core/services/invoice-print/invoice-print-service';

interface BranchApprovalItem {
  
  approvalId: number;
  approvalDate: string;
  apStatus: string;
  apType: string;
  requestSource: string;
  notes: string;
  memberId: string;
  memberName: string | null;
  companyName: string;
  vendorName: string;
  branchName: string;
  formId: string;
  vendorId: string;
  statusText: string;
  statusIcon: string;
  statusColor: string;
  value?: number;
  /** From the backend's deleteInXHours window (online_settings.OnlineProviderCancelApprovalTime) — 0 once it's too late to cancel. */
  deletable: boolean;
  copaymentPercentage?: number;
  approvalLimit?: number;
  servicesCount?: number;
}

/** Statuses grouped under the combined "Cancelled / Rejected" stat tile. */
const CANCELLED_GROUP_STATUSES = ['Cancelled', 'Rejected', 'Suspended'];

@Component({
  selector: 'app-search-results',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
})
export class SearchResults implements OnInit {
  approvals = signal<BranchApprovalItem[]>([]);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5);
  readonly pageSizeOptions = [5, 10, 20, 50, 100];
  Math = Math;

  fromDate = signal<string>('');
  toDate = signal<string>('');

  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  /** Stat-tile filter: 'All', a statusText value, or 'CancelledGroup' (Cancelled+Rejected+Suspended). */
  statusFilter = signal<string>('All');

  /** Row selected for the right-side details panel. */
  selectedId = signal<number | null>(null);

  constructor(
    private service: ApprovalService,
    private authService: AuthService,
    private popup: PopupService,
    private invoicePrint: InvoicePrintService
  ) {}

  statusCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const i of this.approvals()) {
      counts[i.statusText] = (counts[i.statusText] || 0) + 1;
    }
    return counts;
  });

  /** The request shown in the details panel — the selected row, else the first visible one. */
  displayedItem = computed<BranchApprovalItem | null>(() => {
    const list = this.filteredApprovals();
    return list.find((i) => i.approvalId === this.selectedId()) ?? (list.length ? list[0] : null);
  });

  filteredApprovals = computed(() => {
    let all = this.approvals();
    const query = this.searchQuery().toLowerCase();

    const status = this.statusFilter();
    if (status === 'CancelledGroup') {
      all = all.filter(i => CANCELLED_GROUP_STATUSES.includes(i.statusText));
    } else if (status !== 'All') {
      all = all.filter(i => i.statusText === status);
    }

    if (query) {
      all = all.filter(i =>
        i.approvalId.toString().includes(query) ||
        i.memberId.toLowerCase().includes(query) ||
        (i.memberName || '').toLowerCase().includes(query) ||
        (i.companyName || '').toLowerCase().includes(query) ||
        (i.vendorName || '').toLowerCase().includes(query) ||
        (i.branchName || '').toLowerCase().includes(query) ||
        (i.formId || '').toLowerCase().includes(query)
      );
    }

    // فلترة التاريخ تتم في الباك اند عبر starts و ends

    const col = this.sortColumn();
    if (col) {
      const dir = this.sortDirection();
      all = [...all].sort((a,b) => {
        let x: any = a[col as keyof BranchApprovalItem];
        let y: any = b[col as keyof BranchApprovalItem];
        if (col === 'approvalDate') {
          x = new Date(x).getTime();
          y = new Date(y).getTime();
        } else if (typeof x === 'string') {
          x = x.toLowerCase();
          y = y.toLowerCase();
        }
        if (x < y) return dir === 'asc' ? -1 : 1;
        if (x > y) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return all;
  });

  currentItems = computed(() => {
    const filtered = this.filteredApprovals();
    const perPage = this.itemsPerPage();
    const start = (this.currentPage() - 1) * perPage;
    return filtered.slice(start, start + perPage);
  });

  totalPages = computed(() => Math.ceil(this.filteredApprovals().length / this.itemsPerPage()));

  ngOnInit() {
    // الديفولت: تاريخ اليوم للحقلين (من غير وقت)
    const today = this.toDateOnly(new Date());
    this.fromDate.set(today);
    this.toDate.set(today);
    this.loadBranchApprovals();
  }

  // تحويل التاريخ لصيغة date-only (YYYY-MM-DD) لحقول input[type=date]
  private toDateOnly(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  setFromDate(date: string) {
    this.fromDate.set(date);
    if (this.toDate() && date > this.toDate()) this.toDate.set(date);
  }

  setToDate(date: string) {
    this.toDate.set(date);
    if (this.fromDate() && date < this.fromDate()) this.fromDate.set(date);
  }

  clearDateFilter() {
    const today = this.toDateOnly(new Date());
    this.fromDate.set(today);
    this.toDate.set(today);
    this.currentPage.set(1);
    this.loadBranchApprovals();
  }

  /** Explicit Search button — same fetch as changing a date, for users who prefer to press Search. */
  search() {
    this.currentPage.set(1);
    this.loadBranchApprovals();
  }

  loadBranchApprovals() {
    this.isLoading.set(true);
       const branchId = this.authService.getBranchId();
       console.log('branchId:', branchId); // Debugging line
    if (!branchId) {
      console.error('No Branch ID found for this user!');
      return;
    }

    // Date-only fields → full-day range: 00:00:00 through 23:59:59.
    const starts = this.fromDate() ? `${this.fromDate()}T00:00:00` : undefined;
    const ends = this.toDate() ? `${this.toDate()}T23:59:59` : undefined;

    this.service.getbranchapprovals(branchId, starts, ends).subscribe({
      next: (data: any) => {
        const arr = Array.isArray(data) ? data : (data.data || data.approvals || []);
        this.approvals.set(arr.map((i: any) => this.mapApprovalStatus(i)));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  private mapApprovalStatus(i: any): BranchApprovalItem {
    let statusText = '', statusIcon = '', statusColor = '';
    switch (i.apStatus?.toUpperCase()) {
      case 'N': statusText = 'Pending'; statusIcon = '⏱️'; statusColor = 'text-orange-700'; break;
      // case 'N': statusText = 'New'; statusIcon = '📤'; statusColor = 'text-blue-700'; break;
      case 'P': statusText = 'Approved'; statusIcon = '✅'; statusColor = 'text-green-700'; break;
      // case 'C': statusText = 'Cancelled'; statusIcon = '❌'; statusColor = 'text-red-700'; break;
      // case 'R': statusText = 'Rejected'; statusIcon = '❌'; statusColor = 'text-red-700'; break;
      // case 'S': statusText = 'Suspended'; statusIcon = '❌'; statusColor = 'text-red-700'; break;
      default: statusText = 'Rejected'; statusIcon = '❌'; statusColor = 'text-gray-700';
    }
    return {
      approvalId: i.approvalId, approvalDate: i.approvalDate, apStatus: i.apStatus,
      apType: i.apType || 'General', requestSource: i.requestSource || 'Manual',
      notes: i.notes || '-', memberId: i.memberId, memberName: i.memberName,
      companyName: i.companyName || '',
      vendorName: i.vendorName || '',
      branchName: i.branchName || i.v_branch_id || '',
      formId: i.formId || i.pres_id || i.prescriptionId || '',
      vendorId: i.vendorId, statusText, statusIcon, statusColor, value: i.value || 0,
      // Backend defaults missing/undefined to cancellable (deletable !== 0).
      deletable: i.deletable !== 0,
      copaymentPercentage: i.coinsurance ?? 0,
      approvalLimit: i.maxValue ?? undefined,
      servicesCount: i.servicesCount ?? 0
    };
  }

  sort(col: string) {
    if (this.sortColumn() === col) this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    else { this.sortColumn.set(col); this.sortDirection.set('asc'); }
    this.currentPage.set(1);
  }

  getSortIcon(col: string) {
    if (this.sortColumn() !== col) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  // ألوان الصفوف حسب الحالة مثل الشاشة القديمة (jqGrid)
  getRowColor(item: BranchApprovalItem): string {
    switch (item.apStatus?.toUpperCase()) {
      case 'P': return '#DCFFFF';
      case 'C': return 'lightcoral';
      default: return '';
    }
  }

  changePage(p: number) { if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p); }

  setItemsPerPage(count: number) {
    this.itemsPerPage.set(count);
    this.currentPage.set(1);
  }
  updateSearchQuery(q: string) { this.searchQuery.set(q); this.currentPage.set(1); }

  setStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  selectRow(item: BranchApprovalItem) {
    this.selectedId.set(item.approvalId);
  }

  /** Template status-pill class for a request. */
  statusPillClass(item: BranchApprovalItem): string {
    switch (item.statusText) {
      case 'Approved': return 'st-approved';
      case 'Pending': return 'st-pending';
      case 'New': return 'st-review';
      default: return 'st-rejected';
    }
  }
  getPagesArray(): number[] {
    const total = this.totalPages(), current = this.currentPage(), max = 5;
    if (total <= max) return Array.from({length: total}, (_,i) => i+1);
    let start = Math.max(1, current - Math.floor(max/2));
    let end = start + max - 1;
    if (end > total) { end = total; start = end - max + 1; }
    return Array.from({length: max}, (_,i) => start + i);
  }
  formatDate(d: string) { return d ? new Date(d).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'}) : '-'; }
  formatTime(d: string) { return d ? new Date(d).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'}) : '-'; }


// 1. ارفع الـ Import ده فوق خالص في الملف

// جوه الكلاس بتاع الكومبوننت.. ضيف الفانكشن دي في أي مكان:

  exportToExcel(): void {
    // بناخد البيانات المتفلترة حالياً عشان الإكسبورت يحترم البحث والتاريخ
    const dataToExport = this.filteredApprovals();
    
    if (dataToExport.length === 0) {
      this.popup.warning('No data available to export!');
      return;
    }

    // 2. بنشكل البيانات ونرتب الأعمدة بأسماء شيك لملف الإكسيل
    const excelRows = dataToExport.map(item => ({
      'Member ID': item.memberId,
      'Member Name': item.memberName || '-',
      'Company': item.companyName || '-',
      'Service Date': this.formatDate(item.approvalDate),
      'Provider': item.vendorName || item.vendorId,
      'Branch': item.branchName || '-',
      'Auth ID': item.approvalId,
      'Pres ID': item.formId || '-'
    }));

    // 3. لوجيك إنشاء ملف الإكسيل وتحميله
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Approvals List');

    // تسمية الملف بتاريخ اليوم عشان يبقى احترافي
    const fileName = `Approvals_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

    // أمر التحميل الفوري في المتصفح
    XLSX.writeFile(workbook, fileName);
  }

viewDetails(item: BranchApprovalItem) {
    console.log('Viewing item:', item.approvalId);
    // افتح مودال العرض هنا
  }

  editApproval(item: BranchApprovalItem) {
    console.log('Editing item:', item.approvalId);
    // افتح مودال التعديل هنا
  }

  printApproval(item: BranchApprovalItem) {
    console.log('Printing item:', item.approvalId);
    this.invoicePrint.printApprovalById(item.approvalId.toString());
  }


cancelApproval(item: any) {
  this.popup.confirm({
    title: 'Cancel Approval?',
    message: 'Are you sure you want to cancel this approval?',
    confirmText: 'Yes, Cancel',
    cancelText: 'No',
    danger: true,
  }).then((confirmed) => {
    if (confirmed) {

      this.service.cancelApproval(item.approvalId).subscribe({
        next: (res) => {

          if (res.success) {
            this.popup.success('Cancelled', 'Approval cancelled successfully.', { timer: 1500 });

            this.loadBranchApprovals();
          }
          else {
            this.popup.error('Failed', res.messageEn || 'Unable to cancel approval.');
          }
        },
        error: () => {
          this.popup.error('Error', 'Something went wrong.');
        }
      });

    }
  });
}
}