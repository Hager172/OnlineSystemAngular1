import { Component, OnInit, signal, computed } from '@angular/core';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../core/services/auth/auth-service';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

interface BranchApprovalItem {
  approvalId: number;
  approvalDate: string;
  apStatus: string;
  apType: string;
  requestSource: string;
  notes: string;
  memberId: string;
  memberName: string | null;
  vendorId: string;
  statusText: string;
  statusIcon: string;
  statusColor: string;
}

@Component({
  selector: 'app-search-results',
  imports: [FormsModule, CommonModule,RouterLink],
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
})
export class SearchResults implements OnInit {
  approvals = signal<BranchApprovalItem[]>([]);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  itemsPerPage = 5;
  Math = Math;

  fromDate = signal<string>('');
  toDate = signal<string>('');

  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  constructor(private service: ApprovalService,private authService: AuthService) {}

  filteredApprovals = computed(() => {
    let all = this.approvals();
    const query = this.searchQuery().toLowerCase();
    
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

    const from = this.fromDate();
    const to = this.toDate();
    if (from || to) {
      all = all.filter(i => {
        const d = new Date(i.approvalDate);
        if (from && new Date(from) > d) return false;
        if (to) {
          const end = new Date(to);
          end.setHours(23,59,59);
          if (end < d) return false;
        }
        return true;
      });
    }

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
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() => Math.ceil(this.filteredApprovals().length / this.itemsPerPage));

  ngOnInit() {
    this.loadBranchApprovals();
    const today = new Date().toISOString().split('T')[0];
    this.fromDate.set(today);
    this.toDate.set(today);
  }

  setFromDate(date: string) {
    this.fromDate.set(date);
    if (this.toDate() && date > this.toDate()) this.toDate.set(date);
    this.currentPage.set(1);
  }

  setToDate(date: string) {
    this.toDate.set(date);
    if (this.fromDate() && date < this.fromDate()) this.fromDate.set(date);
    this.currentPage.set(1);
  }

  clearDateFilter() {
    this.fromDate.set('');
    this.toDate.set('');
    this.currentPage.set(1);
  }

  loadBranchApprovals() {
    this.isLoading.set(true);
       const branchId = this.authService.getVendorId(); 
       console.log('vbendorid:', branchId); // Debugging line
    if (!branchId) {
      console.error('No Branch ID found for this user!');
      return; 
    }

    this.service.getbranchapprovals(branchId).subscribe({
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
      vendorId: i.vendorId, statusText, statusIcon, statusColor
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


// 1. ارفع الـ Import ده فوق خالص في الملف

// جوه الكلاس بتاع الكومبوننت.. ضيف الفانكشن دي في أي مكان:

  exportToExcel(): void {
    // بناخد البيانات المتفلترة حالياً عشان الإكسبورت يحترم البحث والتاريخ
    const dataToExport = this.filteredApprovals();
    
    if (dataToExport.length === 0) {
      alert('No data available to export!');
      return;
    }

    // 2. بنشكل البيانات ونرتب الأعمدة بأسماء شيك لملف الإكسيل
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
    // لوجيك الطباعة هنا
  }

  
cancelApproval(item: any) {
  Swal.fire({
    title: 'Cancel Approval?',
    text: 'Are you sure you want to cancel this approval?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, Cancel',
    cancelButtonText: 'No'
  }).then((result) => {
    if (result.isConfirmed) {

      this.service.cancelApproval(item.approvalId).subscribe({
        next: (res) => {

          if (res.success) {
            Swal.fire({
              icon: 'success',
              title: 'Cancelled',
              text: 'Approval cancelled successfully.',
              timer: 1500,
              showConfirmButton: false
            });

            this.loadBranchApprovals();
          }
          else {
            Swal.fire({
              icon: 'error',
              title: 'Failed',
              text: res.messageEn || 'Unable to cancel approval.'
            });
          }
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Something went wrong.'
          });
        }
      });

    }
  });
}
}