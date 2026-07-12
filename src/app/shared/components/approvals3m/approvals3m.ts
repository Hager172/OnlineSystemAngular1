import { Component, OnInit, signal, computed } from '@angular/core';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../core/services/auth/auth-service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
interface BranchApprovalItem {
  formId: string;
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
  imports: [FormsModule, CommonModule, RouterModule],
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
    this.loadVendorApprovals();
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

  loadVendorApprovals() {
    const vendorId = this.authService.getVendorId(); 
    console.log('Vendor ID:', vendorId); // Debugging line
    if (!vendorId) {
      console.error('No Vendor ID found for this user!');
      return; 
    }

    this.isLoading.set(true);
    this.service.getbrancha3mpprovals(vendorId).subscribe({
      next: (data: any) => {
        console.log('Vendor Approvals Data:', data);
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
      approvalId: i.approvalId, approvalDate: i.approvalDate, apStatus: i.apStatus
      ,formId: i.formId,  apType: i.apType || 'General', requestSource: i.requestSource || 'Manual',
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
      'Form ID': item.formId,
      'Approval ID': item.approvalId,
      'Member ID': item.memberId,
      'Member Name': item.memberName || '-',
      'Company Name': item.companyName || '-',
      'Branch Name': item.branchName || '-',
      'Date': this.formatDate(item.approvalDate),
      'Vendor ID': item.vendorId,
      'Gross Value': item.value,
      'Local Discount': item.localdiscountvalue,
      'Imported Discount': item.importeddiscountvalue,
      'Copayment (Coinsurance)': item.copaymentvalue,
      'Net Value': item.netvalue,
    }));

    excelRows.push({
      'Form ID': '',
      'Approval ID': 'TOTALS',
      'Date': '', 
      'Member ID': '', 'Member Name': '', 'Company Name': '', 'Branch Name': '',
      'Gross Value': this.totalGrossValue(),
      'Local Discount': this.totalLocalDiscount(),
      'Imported Discount': this.totalImportedDiscount(),
      'Copayment (Coinsurance)': this.totalCopayment(),
      'Net Value': this.totalNetValue(),
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


  // كاش لملفات الخط حتى لا يتم تحميلها مع كل تصدير
  private amiriFonts: { regular: string; bold: string } | null = null;

  private async fetchFontAsBase64(url: string): Promise<string> {
    const buffer = await (await fetch(url)).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  // تسجيل خط Amiri الداعم للعربية داخل مستند الـ PDF
  private async registerArabicFont(doc: jsPDF): Promise<void> {
    if (!this.amiriFonts) {
      const [regular, bold] = await Promise.all([
        this.fetchFontAsBase64('assets/fonts/Amiri-Regular.ttf'),
        this.fetchFontAsBase64('assets/fonts/Amiri-Bold.ttf'),
      ]);
      this.amiriFonts = { regular, bold };
    }
    doc.addFileToVFS('Amiri-Regular.ttf', this.amiriFonts.regular);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.addFileToVFS('Amiri-Bold.ttf', this.amiriFonts.bold);
    doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
  }

  //pdf
async exportToPDF(): Promise<void> {
  const dataToExport = this.filteredApprovals();
  if (dataToExport.length === 0) {
    alert('No data available to export!');
    return;
  }

  // 1. إنشاء كائن الـ PDF بالوضع الأفقي
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // 2. تحميل وتسجيل خط Amiri (خط يحتوي على الحروف العربية فعلياً)
  // الخطوط المدمجة في jsPDF مثل Courier و Helvetica لا تحتوي على حروف عربية،
  // لذلك كانت تظهر رموز غير مفهومة. بعد تسجيل الخط، jsPDF يتولى تشكيل
  // الحروف العربية (وصل الحروف) تلقائياً.
  await this.registerArabicFont(doc);
  doc.setFont('Amiri', 'normal');

  // عنوان التقرير داخل الملف
  doc.setFontSize(16);
  doc.text('Approvals Report / تقرير الموافقات', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

  // الأعمدة التي ستظهر في الـ PDF
  const columns = [
    

      'Form ID',
      'Approval ID',
      'Member ID', 'Member Name', 'Company Name', 'Branch Name',      'Date', 
      'Gross Value', 'Local Discount', 'Imported Discount', 'Copayment (Coinsurance)',
      'Net Value'
  ];

  // تجهيز الصفوف من البيانات المفلترة
  const rows = dataToExport.map(item => [
    item.formId,
    item.approvalId,
    item.memberId,
    item.memberName || '-',
    item.companyName || '-',
    item.branchName || '-',
    this.formatDate(item.approvalDate),
    item.value.toFixed(2),
    item.localdiscountvalue.toFixed(2),
    item.importeddiscountvalue.toFixed(2),
    item.copaymentvalue.toFixed(2),
    item.netvalue.toFixed(2)
  ]);

  // إضافة صف الإجمالي في نهاية الجدول
  rows.push([
    'TOTALS', '', '', '', '', '', '',
    this.totalGrossValue().toFixed(2),
    this.totalLocalDiscount().toFixed(2),
    this.totalImportedDiscount().toFixed(2),
    this.totalCopayment().toFixed(2),
    this.totalNetValue().toFixed(2)
  ]);

  // 3. رسم الجدول وتفعيل خصائص الخطوط العربية و الـ RTL
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 28,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] }, 
    
    // استخدام خط Amiri المسجل أعلاه حتى تظهر الحروف العربية بشكل صحيح
    styles: {
      fontSize: 8,
      overflow: 'linebreak',
      font: 'Amiri',
    },
    
    // تفعيل اتجاه النص من اليمين إلى اليسار للأعمدة التي قد تحتوي على عربي (مثل اسم العضو أو الشركة)
    columnStyles: {
      5: { cellWidth: 40, halign: 'right' }, // عمود اسم العضو
      6: { cellWidth: 35, halign: 'right' }  // عمود الشركة
    },
    
    didParseCell: (data:any) => {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    }
  });

  // تحميل الملف تلقائياً
  const fileName = `Approvals_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
}