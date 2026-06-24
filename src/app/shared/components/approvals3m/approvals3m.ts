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

  // لتحديد الشهر المختار حالياً (all تعني كل الـ 3 أشهر)
  selectedMonthFilter = signal<'all' | 'current' | 'last' | 'twoMonthsAgo'>('all');

  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // أسماء الأشهر للـ Buttons
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  currentMonthName = '';
  lastMonthName = '';
  twoMonthsAgoName = '';

  constructor(private service: ApprovalService,private authService: AuthService) {}

  ngOnInit() {
    this.initMonthNames();
    this.loadBranchApprovals();
  }

 initMonthNames() {
  const now = new Date();
  
  // الشهر الأول السابق (بدل الحالي)
  this.currentMonthName = this.monthNames[new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth()];
  
  // الشهر الثاني السابق
  this.lastMonthName = this.monthNames[new Date(now.getFullYear(), now.getMonth() - 2, 1).getMonth()];
  
  // الشهر الثالث السابق
  this.twoMonthsAgoName = this.monthNames[new Date(now.getFullYear(), now.getMonth() - 3, 1).getMonth()];
}
  // فلترة متطورة تجمع بين (البحث الذكي + زرار الشهر المختار + السورتينج)
  filteredApprovals = computed(() => {
    let all = this.approvals();
    const query = this.searchQuery().toLowerCase();
    const monthFilter = this.selectedMonthFilter();
    
    // 1. الفلترة بحسب الشهر المختار بالـ Buttons
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const twoMonthsAgoDate = new Date(currentYear, currentMonth - 2, 1);

    if (monthFilter !== 'all') {
      all = all.filter(item => {
        const d = new Date(item.approvalDate);
        if (monthFilter === 'current') {
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        } else if (monthFilter === 'last') {
          return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        } else if (monthFilter === 'twoMonthsAgo') {
          return d.getMonth() === twoMonthsAgoDate.getMonth() && d.getFullYear() === twoMonthsAgoDate.getFullYear();
        }
        return true;
      });
    }

    // 2. الفلترة بكلمة البحث (Search Query)
    if (query) {
      all = all.filter(i => 
        i.approvalId.toString().includes(query) ||
        i.memberId.toLowerCase().includes(query) ||
        i.apType.toLowerCase().includes(query) ||
        i.requestSource.toLowerCase().includes(query) ||
        i.vendorId.toLowerCase().includes(query) ||
        i.notes.toLowerCase().includes(query)
      );
    }

    // 3. الترتيب (Sorting)
    const col = this.sortColumn();
    if (col) {
      const dir = this.sortDirection();
      all = [...all].sort((a, b) => {
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
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() => Math.ceil(this.filteredApprovals().length / this.itemsPerPage));

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
      notes: i.notes || '-', memberId: i.memberId, memberName: i.memberName,
      vendorId: i.vendorId, companyName: i.companyName || '-', branchName: i.branchName || '-', statusText, statusIcon, statusColor
    };
  }

  // تغيير فلتر الشهور من خلال الأزرار
  setMonthFilter(filter: 'all' | 'current' | 'last' | 'twoMonthsAgo') {
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
    const excelRows = dataToExport.map(item => ({
      'Status': item.statusText,
      'Approval ID': item.approvalId,
      'Member ID': item.memberId,
      'Request Type': item.apType,
      'Request Source': item.requestSource,
      'Date': this.formatDate(item.approvalDate),
      'Vendor ID': item.vendorId,
      'Notes': item.notes
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Approvals List');
    const fileName = `Approvals_3Months_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  // دوال الـ Actions
  viewDetails(item: BranchApprovalItem) { console.log('Viewing:', item.approvalId); }
  editApproval(item: BranchApprovalItem) { console.log('Editing:', item.approvalId); }
  printApproval(item: BranchApprovalItem) { console.log('Printing:', item.approvalId); }
  cancelApproval(item: BranchApprovalItem) { console.log('Canceling:', item.approvalId); }
}