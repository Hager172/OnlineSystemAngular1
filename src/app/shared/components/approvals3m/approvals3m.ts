import { Component, OnInit, signal, computed } from '@angular/core';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../core/services/auth/auth-service';

interface BranchApprovalItem {
  approvalId: number;
  approvalDate: string;
  apStatus: string;
  apType: string;
  requestSource: string;
  notes: string;
  memberId: string;
  memberName: string | null;
  companyName: string | null;
  branchName: string | null;
  value: number;
  netvalue: number;
  localdiscountvalue: number;
  importeddiscountvalue: number;
  copaymentvalue: number;
  vendorId: string;
  statusText: string;
  statusIcon: string;
  statusColor: string;
}

@Component({
  selector: 'app-approvals3m',
  imports: [FormsModule, CommonModule],
  templateUrl: './approvals3m.html',
  styleUrl: './approvals3m.css',
})
export class Approvals3m implements OnInit {
  approvals = signal<BranchApprovalItem[]>([]);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  itemsPerPage = 5;
  Math = Math;

  // 1. الديفولت بقى 'last' (الشهر اللي فات) وتم استبعاد الشهر الحالي تماماً
  selectedMonthFilter = signal<'last' | 'twoMonthsAgo' | 'threeMonthsAgo'>('last');
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  lastMonthName = '';
  twoMonthsAgoName = '';
  threeMonthsAgoName = '';

  constructor(private service: ApprovalService, private authService: AuthService) {}

  ngOnInit() {
    this.initMonthNames();
    this.loadBranchApprovals();
  }

  initMonthNames() {
    const now = new Date();
    // ترحيل الحسبة لتبدأ من الشهر الماضي وتنزيل 3 شهور لورا (6 و 5 و 4)
    this.lastMonthName = this.monthNames[new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth()];
    this.twoMonthsAgoName = this.monthNames[new Date(now.getFullYear(), now.getMonth() - 2, 1).getMonth()];
    this.threeMonthsAgoName = this.monthNames[new Date(now.getFullYear(), now.getMonth() - 3, 1).getMonth()];
  }

  filteredApprovals = computed(() => {
    let all = this.approvals();
    const query = this.searchQuery().toLowerCase();
    const monthFilter = this.selectedMonthFilter();
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // تجهيز التواريخ للثلاثة شهور السابقة (6 و 5 & 4)
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const twoMonthsAgoDate = new Date(currentYear, currentMonth - 2, 1);
    const threeMonthsAgoDate = new Date(currentYear, currentMonth - 3, 1);

    // الفلترة بناءً على الاختيار المستهدف
    all = all.filter(item => {
      if (!item.approvalDate) return false;
      const d = new Date(item.approvalDate);
      
      if (monthFilter === 'last') {
        return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
      } else if (monthFilter === 'twoMonthsAgo') {
        return d.getMonth() === twoMonthsAgoDate.getMonth() && d.getFullYear() === twoMonthsAgoDate.getFullYear();
      } else if (monthFilter === 'threeMonthsAgo') {
        return d.getMonth() === threeMonthsAgoDate.getMonth() && d.getFullYear() === threeMonthsAgoDate.getFullYear();
      }
      return true;
    });

    if (query) {
      all = all.filter(i => 
        (i.approvalId?.toString() || '').includes(query) ||
        (i.memberId?.toLowerCase() || '').includes(query) ||
        (i.apType?.toLowerCase() || '').includes(query) ||
        (i.requestSource?.toLowerCase() || '').includes(query) ||
        (i.vendorId?.toLowerCase() || '').includes(query) ||
        (i.notes?.toLowerCase() || '').includes(query)
      );
    }

    const col = this.sortColumn();
    if (col) {
      const dir = this.sortDirection();
      all = [...all].sort((a, b) => {
        let x: any = a[col as keyof BranchApprovalItem];
        let y: any = b[col as keyof BranchApprovalItem];
        if (col === 'approvalDate') {
          x = x ? new Date(x).getTime() : 0;
          y = y ? new Date(y).getTime() : 0;
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

  totalGrossValue = computed(() => this.filteredApprovals().reduce((sum, item) => sum + (item.value || 0), 0));
  totalCopayment = computed(() => this.filteredApprovals().reduce((sum, item) => sum + (item.copaymentvalue || 0), 0));
  totalImportedDiscount = computed(() => this.filteredApprovals().reduce((sum, item) => sum + (item.importeddiscountvalue || 0), 0));
  totalLocalDiscount = computed(() => this.filteredApprovals().reduce((sum, item) => sum + (item.localdiscountvalue || 0), 0));
  totalNetValue = computed(() => this.filteredApprovals().reduce((sum, item) => sum + (item.netvalue || 0), 0));

  currentItems = computed(() => {
    const filtered = this.filteredApprovals();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() => Math.ceil(this.filteredApprovals().length / this.itemsPerPage) || 1);

  loadBranchApprovals() {
    const branchId = this.authService.getBranchId(); 
    if (!branchId) {
      console.error('No Branch ID found for this user!');
      return; 
    }

    this.isLoading.set(true);
    this.service.getbrancha3mpprovals(branchId).subscribe({
      next: (data: any) => {
        console.log('Branch Approvals Data:', data);
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
      case 'P': statusText = 'Pending'; statusIcon = '⏱️'; statusColor = 'text-orange-700'; break;
      case 'N': statusText = 'Submitted'; statusIcon = '📤'; statusColor = 'text-blue-700'; break;
      case 'D': statusText = 'Approved'; statusIcon = '✅'; statusColor = 'text-green-700'; break;
      case 'C': statusText = 'Cancelled'; statusIcon = '❌'; statusColor = 'text-red-700'; break;
      default: statusText = 'Unknown'; statusIcon = '❓'; statusColor = 'text-gray-700';
    }
    return {
      approvalId: i.approvalId, approvalDate: i.approvalDate, apStatus: i.apStatus,
      apType: i.apType || 'General', requestSource: i.requestSource || 'Manual',
      notes: i.notes || '-', memberId: i.memberId, memberName: i.memberName, value: i.value || 0, netvalue: i.netvalue || 0,
      localdiscountvalue: i.localdiscountvalue || 0, importeddiscountvalue: i.importeddiscountvalue || 0, copaymentvalue: i.copaymentvalue || 0,
      vendorId: i.vendorId, companyName: i.companyName || '-', branchName: i.branchName || '-', statusText, statusIcon, statusColor
    };
  }

  // تحديث القيم المقبولة للفلتر الجديد
  setMonthFilter(filter: 'last' | 'twoMonthsAgo' | 'threeMonthsAgo') {
    this.selectedMonthFilter.set(filter);
    this.currentPage.set(1);
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

  changePage(p: number) { if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p); }
  updateSearchQuery(q: string) { this.searchQuery.set(q); this.currentPage.set(1); }
  
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

  exportToExcel(): void {
    const dataToExport = this.filteredApprovals(); 
    if (dataToExport.length === 0) {
      alert('No data available to export!');
      return;
    }

    const excelRows: any[] = dataToExport.map(item => ({
      'Approval ID': item.approvalId,
      'Date': this.formatDate(item.approvalDate),
      'Time': this.formatTime(item.approvalDate),
      'Status': item.statusText,
      'Request Type': item.apType,
      'Request Source': item.requestSource,
      'Member ID': item.memberId,
      'Member Name': item.memberName || '-',
      'Company Name': item.companyName || '-',
      'Branch Name': item.branchName || '-',
      'Vendor ID': item.vendorId,
      'Gross Value': item.value,
      'Copayment (Coinsurance)': item.copaymentvalue,
      'Imported Discount': item.importeddiscountvalue,
      'Local Discount': item.localdiscountvalue,
      'Net Value': item.netvalue,
      'Notes': item.notes
    }));

    excelRows.push({
      'Approval ID': 'TOTALS',
      'Date': '', 'Time': '', 'Status': '', 'Request Type': '', 'Request Source': '',
      'Member ID': '', 'Member Name': '', 'Company Name': '', 'Branch Name': '', 'Vendor ID': '',
      'Gross Value': this.totalGrossValue(),
      'Copayment (Coinsurance)': this.totalCopayment(),
      'Imported Discount': this.totalImportedDiscount(),
      'Local Discount': this.totalLocalDiscount(),
      'Net Value': this.totalNetValue(),
      'Notes': ''
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Approvals Data');

    const fileName = `All_Approvals_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  viewDetails(item: BranchApprovalItem) { console.log('Viewing:', item.approvalId); }
  editApproval(item: BranchApprovalItem) { console.log('Editing:', item.approvalId); }
  printApproval(item: BranchApprovalItem) { console.log('Printing:', item.approvalId); }
  cancelApproval(item: BranchApprovalItem) { console.log('Canceling:', item.approvalId); }
}