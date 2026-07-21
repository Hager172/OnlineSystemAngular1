import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as QRCode from 'qrcode';
import { ApprovalService } from '../Approval/approval-service';
import { AuthService } from '../auth/auth-service';
import { PopupService } from '../popup/popup-service';
import { Approval } from '../../../shared/interfaces/approval/approval';

/**
 * Renders the same "Invoice" PDF used by the print icon on /search-results.
 * Shared so any page can offer the identical print action for an approval number.
 */
@Injectable({
  providedIn: 'root'
})
export class InvoicePrintService {
  private amiriFonts: { regular: string; bold: string } | null = null;

  constructor(
    private approvalService: ApprovalService,
    private authService: AuthService,
    private popup: PopupService
  ) {}

  printApprovalById(approvalNumber: string): void {
    this.popup.loading('Generating Invoice...');

    this.approvalService.getApprovalPrint(approvalNumber).subscribe({
      next: async (approval) => {
        try {
          await this.renderInvoicePDF(approval);
          this.popup.close();
        } catch (error) {
          console.error('Error generating PDF:', error);
          this.popup.error('Error', 'Error generating PDF. Please try again.');
        }
      },
      error: (err) => {
        console.error('Error loading approval print data:', err);
        this.popup.error('Error', 'Could not load approval data.');
      }
    });
  }

  private formatDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  }

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

    const [clientImg, vendorImg] = await Promise.all([
      this.loadImageData(approval.companyLogo || ''),
      this.loadImageData(approval.vendorLogo || '')
    ]);
    if (clientImg) doc.addImage(clientImg.data, clientImg.format, margin, 8, 34, 20);
    if (vendorImg) doc.addImage(vendorImg.data, vendorImg.format, pageWidth - margin - 34, 8, 34, 20);

    doc.setFontSize(26);
    doc.setTextColor(0, 0, 0);
    doc.text('Invoice', pageWidth / 2, 20, { align: 'center' });
    const titleWidth = doc.getTextWidth('Invoice');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - titleWidth / 2, 22.5, pageWidth / 2 + titleWidth / 2, 22.5);

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

    y += 12;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);

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

    const subtotal = approval.items.reduce((sum, it) => sum + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
    const limit = approval.limit || 0;
    const withinLimit = limit > 0 ? Math.min(subtotal, limit) : subtotal;
    const exceeding = limit > 0 ? Math.max(0, subtotal - limit) : 0;
    const copayPct = approval.items[0]?.copayment ?? approval.copaymentPercentage ?? 0;
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

    try {
      const qrDataUrl = await QRCode.toDataURL(approval.approvalNumber, { width: 200, margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', margin, totalsY + 10, 26, 26);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

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
}
