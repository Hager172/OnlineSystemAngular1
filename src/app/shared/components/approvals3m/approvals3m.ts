import { Component, OnInit, signal, computed } from '@angular/core';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
// xlsx-js-style is SheetJS community + cell styling; the plain `xlsx` build
// silently drops the `s` (style) property when writing.
import * as XLSX from 'xlsx-js-style';
import { AuthService } from '../../../core/services/auth/auth-service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
/** A column of the monthly claims report, rendered to both Excel and PDF. */
interface ReportColumn {
  header: string;
  value: (i: BranchApprovalItem) => string | number;
  /** Totals-row value; columns without one are left blank. */
  total?: () => number;
  /** Money → right-aligned, #,##0.00. */
  money?: boolean;
  /** May hold Arabic → right-aligned in the PDF. */
  rtl?: boolean;
}

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

  arabicMonthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  /** clientId → how the client is named and logoed on the exports. Same ids
   *  and asset paths the site header uses. */
  private readonly clientNames: Record<string, { ar: string; en: string; logo: string }> = {
    '2': { ar: 'المشرق للرعاية الطبية', en: 'Mashreq', logo: 'assets/logos/mashreq.svg' },
    '3': { ar: 'Medigold', en: 'Medigold', logo: 'assets/logos/medigold.svg' },
  };

  /** How many months back each filter points. */
  private readonly monthsBack: Record<'last' | 'twoMonthsAgo' | 'threeMonthsAgo', number> = {
    last: 1,
    twoMonthsAgo: 2,
    threeMonthsAgo: 3,
  };

  constructor(private service: ApprovalService, private authService: AuthService) {}

  ngOnInit() {
    this.initMonthNames();
    this.loadVendorApprovals();
  }

  initMonthNames() {
    // ترحيل الحسبة لتبدأ من الشهر الماضي وتنزيل 3 شهور لورا (6 و 5 و 4)
    this.lastMonthName = this.monthNames[this.monthDateFor('last').getMonth()];
    this.twoMonthsAgoName = this.monthNames[this.monthDateFor('twoMonthsAgo').getMonth()];
    this.threeMonthsAgoName = this.monthNames[this.monthDateFor('threeMonthsAgo').getMonth()];
  }

  /** First day of the month a filter points at — the one source of truth for
   *  which month is shown, so the export title can't disagree with the rows. */
  private monthDateFor(filter: 'last' | 'twoMonthsAgo' | 'threeMonthsAgo'): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - this.monthsBack[filter], 1);
  }

  filteredApprovals = computed(() => {
    let all = this.approvals();
    const query = this.searchQuery().toLowerCase();
    const monthFilter = this.selectedMonthFilter();
    
    // الفلترة بناءً على الاختيار المستهدف
    const targetMonth = this.monthDateFor(monthFilter);
    all = all.filter(item => {
      if (!item.approvalDate) return false;
      const d = new Date(item.approvalDate);
      return d.getMonth() === targetMonth.getMonth() && d.getFullYear() === targetMonth.getFullYear();
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
  totalDiscounts = computed(() => this.totalLocalDiscount() + this.totalImportedDiscount());

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

  /** Client the export is for, from the client the user is logged into. */
  private get exportClient(): { ar: string; en: string; logo: string } {
    return this.clientNames[this.authService.getclientid() ?? ''] ?? { ar: '', en: 'Client', logo: '' };
  }

  /** Arabic title of the export, e.g. "مطالبات شهر يونيو 2026 - المشرق للرعاية الطبية". */
  get exportTitle(): string {
    const d = this.monthDateFor(this.selectedMonthFilter());
    const month = `${this.arabicMonthNames[d.getMonth()]} ${d.getFullYear()}`;
    const client = this.exportClient.ar;
    return client ? `مطالبات شهر ${month} - ${client}` : `مطالبات شهر ${month}`;
  }

  /**
   * The report's columns — label, how to read a row, its total, alignment.
   * Shared by the Excel and PDF exports so the two can't drift apart.
   */
  private reportColumns(): ReportColumn[] {
    return [
      { header: 'Form ID', value: i => i.formId || '-' },
      { header: 'Approval ID', value: i => i.approvalId },
      { header: 'Member ID', value: i => i.memberId || '-' },
      { header: 'Member Name', rtl: true, value: i => i.memberName || '-' },
      { header: 'Company Name', rtl: true, value: i => i.companyName || '-' },
      { header: 'Branch Name', value: i => i.branchName || '-' },
      { header: 'Date', value: i => this.formatDate(i.approvalDate) },
      { header: 'Vendor ID', value: i => i.vendorId || '-' },
      { header: 'Gross Value', money: true, value: i => i.value || 0, total: () => this.totalGrossValue() },
      { header: 'Local Discount', money: true, value: i => i.localdiscountvalue || 0, total: () => this.totalLocalDiscount() },
      { header: 'Imported Discount', money: true, value: i => i.importeddiscountvalue || 0, total: () => this.totalImportedDiscount() },
      { header: 'Copayment (Coinsurance)', money: true, value: i => i.copaymentvalue || 0, total: () => this.totalCopayment() },
      { header: 'Net Value', money: true, value: i => i.netvalue || 0, total: () => this.totalNetValue() },
    ];
  }

  /** Summary line under the title — print date, claim count and the four totals. */
  private reportSubtitle(count: number): string {
    return [
      `تاريخ الطباعة: ${new Date().toLocaleDateString('en-GB')}`,
      `عدد المطالبات: ${count}`,
      `Gross Value: ${this.formatMoney(this.totalGrossValue())}`,
      `Copayment: ${this.formatMoney(this.totalCopayment())}`,
      `Total Discounts: ${this.formatMoney(this.totalDiscounts())}`,
      `Net Value: ${this.formatMoney(this.totalNetValue())}`,
    ].join('  -  ');
  }

  /** Base file name shared by both exports, e.g. Claims_June_2026_Mashreq. */
  private reportFileName(): string {
    const d = this.monthDateFor(this.selectedMonthFilter());
    return `Claims_${this.monthNames[d.getMonth()]}_${d.getFullYear()}_${this.exportClient.en}`;
  }

  exportToExcel(): void {
    const dataToExport = this.filteredApprovals();
    if (dataToExport.length === 0) {
      alert('No data available to export!');
      return;
    }

    const columns = this.reportColumns();
    const lastCol = columns.length - 1;
    const subtitle = this.reportSubtitle(dataToExport.length);
    const dataRows = dataToExport.map(item => columns.map(c => c.value(item)));
    const totalsRow = columns.map((c, i) => (c.total ? c.total() : i === 0 ? 'TOTALS' : ''));

    // rows 1-2 are the title block, row 3 is a spacer, row 4 is the column headers
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([
      [this.exportTitle],
      [subtitle],
      [],
      columns.map(c => c.header),
      ...dataRows,
      totalsRow,
    ]);

    const HEADER_ROW = 3;                       // 0-based → row 4
    const FIRST_DATA_ROW = HEADER_ROW + 1;
    const TOTALS_ROW = FIRST_DATA_ROW + dataRows.length;
    const cellAt = (r: number, c: number) => worksheet[XLSX.utils.encode_cell({ r, c })];

    // title + subtitle span the full table width
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    ];
    worksheet['!rows'] = [{ hpt: 26 }, { hpt: 18 }, { hpt: 6 }, { hpt: 22 }];

    // each column as wide as its longest cell, within sane bounds
    worksheet['!cols'] = columns.map((c, idx) => {
      const widest = dataRows.reduce(
        (max, row) => Math.max(max, this.excelCellWidth(row[idx], c.money)),
        c.header.length
      );
      return { wch: Math.min(Math.max(widest + 2, 10), 40) };
    });

    // filter/sort handles on the data only — never over the totals row
    worksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range(
        { s: { r: HEADER_ROW, c: 0 }, e: { r: TOTALS_ROW - 1, c: lastCol } }
      ),
    };

    const thin = { style: 'thin', color: { rgb: 'D5DDE5' } };
    const box = { top: thin, bottom: thin, left: thin, right: thin };

    const titleCell = cellAt(0, 0);
    if (titleCell) {
      titleCell.s = {
        font: { bold: true, sz: 14, color: { rgb: '0E7360' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    const subtitleCell = cellAt(1, 0);
    if (subtitleCell) {
      subtitleCell.s = {
        font: { sz: 10, color: { rgb: '6B7C8C' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    columns.forEach((_, c) => {
      const cell = cellAt(HEADER_ROW, c);
      if (!cell) return;
      cell.s = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0E7360' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: box,
      };
    });

    dataRows.forEach((_, r) => {
      columns.forEach((c, idx) => {
        const cell = cellAt(FIRST_DATA_ROW + r, idx);
        if (!cell) return;
        cell.s = {
          alignment: { horizontal: c.money ? 'right' : 'left', vertical: 'center' },
          border: box,
        };
        if (c.money) cell.z = '#,##0.00';
      });
    });

    columns.forEach((c, idx) => {
      const cell = cellAt(TOTALS_ROW, idx);
      if (!cell) return;
      cell.s = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: 'EEF3F7' } },
        alignment: { horizontal: c.money ? 'right' : 'left', vertical: 'center' },
        border: box,
      };
      if (c.money) cell.z = '#,##0.00';
    });

    const monthDate = this.monthDateFor(this.selectedMonthFilter());
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    const sheetName = `Claims ${this.monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
    XLSX.writeFile(workbook, `${this.reportFileName()}.xlsx`);
  }

  /** Money as text for the export title block — matches the #,##0.00 used in the cells. */
  private formatMoney(n: number): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Rendered width of a cell — money is written raw but displayed as #,##0.00. */
  private excelCellWidth(value: string | number, money?: boolean): number {
    if (money) return Number(value).toFixed(2).length + 2; // + thousands separators
    return String(value ?? '').length;
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

  /**
   * Loads a logo for jsPDF, which takes PNG/JPEG but not SVG. SVG sources are
   * rasterised through a canvas; raster sources are passed through untouched so
   * a photo isn't re-encoded. The pixel size comes back too, so the caller can
   * keep the aspect ratio (the logos are not all the same shape).
   * Null on any failure — a missing logo must never block the export.
   */
  private async loadLogoImage(
    url: string
  ): Promise<{ data: string; format: 'PNG' | 'JPEG'; width: number; height: number } | null> {
    try {
      if (!url) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        // also guards against a dev-server SPA fallback handing back HTML:
        // that fails to decode and lands in the catch below
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error(`could not decode ${url}`));
          el.src = objectUrl;
        });

        if (blob.type.includes('svg')) {
          // render above print size so the logo stays sharp when scaled down
          const scale = 4;
          const canvas = document.createElement('canvas');
          canvas.width = (img.naturalWidth || 230) * scale;
          canvas.height = (img.naturalHeight || 64) * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return { data: canvas.toDataURL('image/png'), format: 'PNG', width: canvas.width, height: canvas.height };
        }

        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        return {
          data,
          format: blob.type.includes('png') ? 'PNG' : 'JPEG',
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (err) {
      console.log('error loading logo for export', err);
      return null;
    }
  }

  /**
   * The logged-in vendor's logo — assets/VendorImages/<vendorId>.jpg.
   * The folder mixes .jpg and .JPG, so try both: a case-sensitive host would
   * 404 on the wrong one.
   */
  private async loadVendorLogo(): Promise<Awaited<ReturnType<typeof this.loadLogoImage>>> {
    // the id is stored padded in places (the API trims it on write), and a
    // stray space would quietly 404 the logo
    const vendorId = this.authService.getVendorId()?.trim();
    if (!vendorId) return null;
    for (const ext of ['jpg', 'JPG']) {
      const logo = await this.loadLogoImage(`assets/VendorImages/${encodeURIComponent(vendorId)}.${ext}`);
      if (logo) return logo;
    }
    return null;
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const teal: [number, number, number] = [14, 115, 96];

  // 2. تحميل وتسجيل خط Amiri (خط يحتوي على الحروف العربية فعلياً)
  // الخطوط المدمجة في jsPDF مثل Courier و Helvetica لا تحتوي على حروف عربية،
  // لذلك كانت تظهر رموز غير مفهومة. بعد تسجيل الخط، jsPDF يتولى تشكيل
  // الحروف العربية (وصل الحروف) تلقائياً.
  await this.registerArabicFont(doc);
  doc.setFont('Amiri', 'normal');

  // شعار العميل يسار وشعار الفيندور يمين — أي شعار ناقص يتخطى بهدوء
  const [clientLogo, vendorLogo] = await Promise.all([
    this.loadLogoImage(this.exportClient.logo),
    this.loadVendorLogo(),
  ]);
  // نفس الصندوق للاثنين مع الحفاظ على نسبة الأبعاد
  const fitBox = (logo: { width: number; height: number }) => {
    const fit = Math.min(34 / logo.width, 16 / logo.height);
    return { w: logo.width * fit, h: logo.height * fit };
  };
  if (clientLogo) {
    const { w, h } = fitBox(clientLogo);
    doc.addImage(clientLogo.data, clientLogo.format, margin, 8, w, h);
  }
  if (vendorLogo) {
    const { w, h } = fitBox(vendorLogo);
    doc.addImage(vendorLogo.data, vendorLogo.format, pageWidth - margin - w, 8, w, h);
  }

  // نفس ترويسة ملف الإكسل: العنوان بالعربي ثم سطر الإجماليات
  doc.setFont('Amiri', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...teal);
  doc.text(this.exportTitle, pageWidth / 2, 16, { align: 'center' });

  doc.setFont('Amiri', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 124, 140);
  doc.text(this.reportSubtitle(dataToExport.length), pageWidth / 2, 23, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  const columns = this.reportColumns();
  const rows = dataToExport.map(item =>
    columns.map(c => (c.money ? this.formatMoney(Number(c.value(item))) : String(c.value(item))))
  );
  rows.push(
    columns.map((c, i) => (c.total ? this.formatMoney(c.total()) : i === 0 ? 'TOTALS' : ''))
  );

  // الأعمدة الرقمية لليمين، وأعمدة الأسماء (قد تحتوي عربي) لليمين كذلك
  const columnStyles: Record<number, any> = {};
  columns.forEach((c, i) => {
    if (c.money) columnStyles[i] = { halign: 'right' };
    else if (c.rtl) columnStyles[i] = { halign: 'right', cellWidth: 32 };
  });

  // 3. رسم الجدول وتفعيل خصائص الخطوط العربية و الـ RTL
  autoTable(doc, {
    head: [columns.map(c => c.header)],
    body: rows,
    startY: 28,
    theme: 'striped',
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
    headStyles: {
      fillColor: teal,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },

    // استخدام خط Amiri المسجل أعلاه حتى تظهر الحروف العربية بشكل صحيح
    styles: {
      fontSize: 7,
      cellPadding: 1.6,
      overflow: 'linebreak',
      font: 'Amiri',
      lineColor: [213, 221, 229],
      lineWidth: 0.1,
    },
    columnStyles,

    // صف الإجمالي في الأسفل — عريض وبخلفية رمادية مثل ملف الإكسل
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [238, 243, 247];
      }
    },
  });

  // تحميل الملف تلقائياً
  doc.save(`${this.reportFileName()}.pdf`);
}
}