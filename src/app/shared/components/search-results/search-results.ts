import { Component, OnInit, signal, computed } from '@angular/core';
import { ApprovalService } from '../../../core/services/Approval/approval-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../core/services/auth/auth-service';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as QRCode from 'qrcode';
import { Approval } from '../../interfaces/approval/approval';

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
  presId: string;
  vendorId: string;
  statusText: string;
  statusIcon: string;
  statusColor: string;
  value?: number;
}

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
        (i.memberName || '').toLowerCase().includes(query) ||
        (i.companyName || '').toLowerCase().includes(query) ||
        (i.vendorName || '').toLowerCase().includes(query) ||
        (i.branchName || '').toLowerCase().includes(query) ||
        (i.presId || '').toLowerCase().includes(query)
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
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() => Math.ceil(this.filteredApprovals().length / this.itemsPerPage));

  ngOnInit() {
    // الديفولت: تاريخ ووقت الآن للحقلين
    const now = this.toDateTimeLocal(new Date());
    this.fromDate.set(now);
    this.toDate.set(now);
    this.loadBranchApprovals();
  }

  // تحويل التاريخ لصيغة datetime-local (YYYY-MM-DDTHH:mm)
  private toDateTimeLocal(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  setFromDate(date: string) {
    this.fromDate.set(date);
    if (this.toDate() && date > this.toDate()) this.toDate.set(date);
    this.currentPage.set(1);
    this.loadBranchApprovals();
  }

  setToDate(date: string) {
    this.toDate.set(date);
    if (this.fromDate() && date < this.fromDate()) this.fromDate.set(date);
    this.currentPage.set(1);
    this.loadBranchApprovals();
  }

  clearDateFilter() {
    const now = this.toDateTimeLocal(new Date());
    this.fromDate.set(now);
    this.toDate.set(now);
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

    this.service.getbranchapprovals(branchId, this.fromDate(), this.toDate()).subscribe({
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
      case 'H': statusText = 'Pending'; statusIcon = '⏱️'; statusColor = 'text-orange-700'; break;
      case 'N': statusText = 'New'; statusIcon = '📤'; statusColor = 'text-blue-700'; break;
      case 'D': statusText = 'Approved'; statusIcon = '✅'; statusColor = 'text-green-700'; break;
      case 'C': statusText = 'Cancelled'; statusIcon = '❌'; statusColor = 'text-red-700'; break;
      case 'R': statusText = 'Rejected'; statusIcon = '❌'; statusColor = 'text-red-700'; break;
      case 'S': statusText = 'Suspended'; statusIcon = '❌'; statusColor = 'text-red-700'; break;
      default: statusText = 'Unknown'; statusIcon = '❓'; statusColor = 'text-gray-700';
    }
    return {
      approvalId: i.approvalId, approvalDate: i.approvalDate, apStatus: i.apStatus,
      apType: i.apType || 'General', requestSource: i.requestSource || 'Manual',
      notes: i.notes || '-', memberId: i.memberId, memberName: i.memberName,
      companyName: i.companyName || '',
      vendorName: i.vendorName || '',
      branchName: i.branchName || i.v_branch_id || '',
      presId: i.presId || i.pres_id || i.prescriptionId || '',
      vendorId: i.vendorId, statusText, statusIcon, statusColor, value: i.value || 0
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
      'Member ID': item.memberId,
      'Member Name': item.memberName || '-',
      'Company': item.companyName || '-',
      'Service Date': this.formatDate(item.approvalDate),
      'Provider': item.vendorName || item.vendorId,
      'Branch': item.branchName || '-',
      'Auth ID': item.approvalId,
      'Pres ID': item.presId || '-'
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
    this.generateInvoicePDF(item);
  }

  private amiriFonts: { regular: string; bold: string } | null = null;

  private async fetchFontAsBase64(url: string): Promise<string> {
    try {
      const buffer = await (await fetch(url)).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    } catch (error) {
      console.error('Error loading font:', error);
      return '';
    }
  }

  private async registerArabicFont(doc: jsPDF): Promise<void> {
    if (!this.amiriFonts) {
      const [regular, bold] = await Promise.all([
        this.fetchFontAsBase64('assets/fonts/Amiri-Regular.ttf'),
        this.fetchFontAsBase64('assets/fonts/Amiri-Bold.ttf'),
      ]);
      this.amiriFonts = { regular, bold };
    }
    if (this.amiriFonts.regular) {
      doc.addFileToVFS('Amiri-Regular.ttf', this.amiriFonts.regular);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    }
    if (this.amiriFonts.bold) {
      doc.addFileToVFS('Amiri-Bold.ttf', this.amiriFonts.bold);
      doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
    }
  }

  generateInvoicePDF(item: BranchApprovalItem) {
    Swal.fire({
      title: 'Generating Invoice...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.service.getApprovalPrint(item.approvalId.toString()).subscribe({
      next: async (approval) => {
        try {
          await this.renderInvoicePDF(approval);
          Swal.close();
        } catch (error) {
          console.error('Error generating PDF:', error);
          Swal.fire({ icon: 'error', title: 'Error', text: 'Error generating PDF. Please try again.' });
        }
      },
      error: (err) => {
        console.error('Error loading approval print data:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load approval data.' });
      }
    });
  }

  // تحميل صورة (رابط أو Base64) وتحويلها لصيغة يقبلها jsPDF
  private async loadImageData(src: string): Promise<{ data: string; format: string } | null> {
    try {
      if (!src) return null;
      let dataUrl = src;
      if (src.startsWith('http') || src.startsWith('/') || src.startsWith('assets')) {
        const blob = await (await fetch(src)).blob();
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else if (!src.startsWith('data:')) {
        dataUrl = `data:image/png;base64,${src}`;
      }
      const format = dataUrl.substring(5, dataUrl.indexOf(';')).includes('png') ? 'PNG' : 'JPEG';
      return { data: dataUrl, format };
    } catch (error) {
      console.error('Error loading image:', error);
      return null;
    }
  }

  private async renderInvoicePDF(approval: Approval) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const teal: [number, number, number] = [20, 150, 160];
    const margin = 14;

    await this.registerArabicFont(doc);
    doc.setFont('Amiri', 'normal');

    // ===== الصور أعلى الصفحة: صورة العميل يسار وصورة الفيندور يمين =====
    const [clientImg, vendorImg] = await Promise.all([
      this.loadImageData(approval.companyLogo || ''),
      this.loadImageData(approval.vendorLogo || '')
    ]);
    if (clientImg) doc.addImage(clientImg.data, clientImg.format, margin, 8, 34, 20);
    if (vendorImg) doc.addImage(vendorImg.data, vendorImg.format, pageWidth - margin - 34, 8, 34, 20);

    // ===== العنوان Invoice في المنتصف مع خط تحته =====
    doc.setFontSize(26);
    doc.setTextColor(0, 0, 0);
    doc.text('Invoice', pageWidth / 2, 20, { align: 'center' });
    const titleWidth = doc.getTextWidth('Invoice');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - titleWidth / 2, 22.5, pageWidth / 2 + titleWidth / 2, 22.5);

    // ===== أدوات رسم صناديق العناوين =====
    const labelBox = (text: string, x: number, y: number, w: number) => {
      doc.setFillColor(teal[0], teal[1], teal[2]);
      doc.rect(x, y, w, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(text, x + 2, y + 5);
    };
    const labelValue = (text: string, x: number, y: number) => {
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.text(text, x, y + 5);
    };

    // ===== بيانات الموافقة: عمود يسار وعمود يمين =====
    const leftLabelW = 26;
    const rightX = 118;
    const rightLabelW = 32;
    let y = 42;

    labelBox('From:', margin, y, leftLabelW);
    labelValue(approval.companyName || '-', margin + leftLabelW + 3, y);
    labelBox('Invoice', rightX, y, rightLabelW);
    labelValue(approval.invoiceNumber || approval.approvalNumber, rightX + rightLabelW + 3, y);

    y += 10;
    labelBox('Branch:', margin, y, leftLabelW);
    labelValue(approval.branch || '-', margin + leftLabelW + 3, y);
    labelBox('Client Name:', rightX, y, rightLabelW);
    labelValue(approval.clientName || '-', rightX + rightLabelW + 3, y);

    y += 10;
    labelBox('To:', margin, y, leftLabelW);
    labelValue('المشرق للرعاية الطبية', margin + leftLabelW + 3, y);
    labelBox('Client ID:', rightX, y, rightLabelW);
    labelValue(approval.clientId || '-', rightX + rightLabelW + 3, y);

    y += 10;
    labelBox('Printed', margin, y, leftLabelW);
    labelValue(new Date().toLocaleString('en-GB'), margin + leftLabelW + 3, y);
    labelBox('Service Date:', rightX, y, rightLabelW);
    labelValue(this.formatDate(approval.serviceDate || approval.date), rightX + rightLabelW + 3, y);

    y += 10;
    labelBox('Diagnose', margin, y, leftLabelW);
    labelValue(approval.diagnose || '-', margin + leftLabelW + 3, y);

    // خط فاصل قبل الجدول
    y += 12;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);

    // ===== جدول الخدمات من بيانات الموافقة الفعلية =====
    const rows = approval.items.map((it, index) => [
      (index + 1).toString(),
      it.name || it.description || '-',
      (it.quantity || 0).toString(),
      it.quantityUnit || 'Unit',
      (it.unitPrice || 0).toFixed(1),
      ((it.quantity || 0) * (it.unitPrice || 0)).toFixed(1)
    ]);

    autoTable(doc, {
      head: [['', 'Name', 'QtyApprov', '', 'Price', 'Total']],
      body: rows,
      startY: y + 3,
      theme: 'plain',
      headStyles: { fillColor: teal, textColor: 255, fontSize: 10, fontStyle: 'bold', font: 'Amiri', halign: 'center' },
      bodyStyles: { fontSize: 9, textColor: 50, font: 'Amiri', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 78 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      }
    });

    // ===== الإجماليات: Total / Co- / Net / Max. Limit =====
    const subtotal = approval.items.reduce((sum, it) => sum + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
    const limit = approval.limit || 0;
    const withinLimit = limit > 0 ? Math.min(subtotal, limit) : subtotal;
    const exceeding = limit > 0 ? Math.max(0, subtotal - limit) : 0;
    // نسبة التحمل: من أول بند في الخدمات، وإلا من رأس الموافقة
    const copayPct = approval.items[0]?.copayment ?? approval.copaymentPercentage ?? 0;
    // قيمة التحمل = النسبة على القيمة داخل الحد + كامل المبلغ الزائد عن الحد يدفعه العضو
    const totalCopay = (withinLimit * copayPct) / 100 + exceeding;
    const net = subtotal - totalCopay;

    let totalsY = ((doc as any).lastAutoTable.finalY || y + 30) + 5;
    doc.setLineWidth(0.8);
    doc.line(margin, totalsY, pageWidth - margin, totalsY);
    totalsY += 4;

    labelBox('Total:', margin, totalsY, 26);
    labelValue(subtotal.toFixed(1), margin + 29, totalsY);
    labelBox('Co-', 88, totalsY, 22);
    labelValue(`[${copayPct.toFixed(1)}%] ${totalCopay.toFixed(1)}`, 113, totalsY);
    labelBox('Net:', 155, totalsY, 18);
    labelValue(net.toFixed(1), 176, totalsY);

    totalsY += 9;
    labelBox('Max. Limit:', margin, totalsY, 26);
    labelValue(limit > 0 ? limit.toFixed(1) : '-', margin + 29, totalsY);

    // ===== QR Code لرقم الموافقة =====
    try {
      const qrDataUrl = await QRCode.toDataURL(approval.approvalNumber, { width: 200, margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', margin, totalsY + 10, 26, 26);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    // ===== التذييل =====
    const footerY = pageHeight - 30;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    const username = this.authService.getUsername() || '-';
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`Last Updated by :  ${username}`, margin, footerY);
    doc.text(`Printed by :  ${username}`, margin, footerY + 7);

    doc.text('Terms & Condition', 120, footerY);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('All prices and costs are supposed to be in EGPs only. Kindly refer to our', 120, footerY + 5);
    doc.text('official website for more information about Terms & Condition.', 120, footerY + 9);

    const pdfBlob = doc.output('blob') as Blob;
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
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