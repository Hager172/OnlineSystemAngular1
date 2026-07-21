import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApprovalService } from '../../../../core/services/Approval/approval-service';
import { InvoicePrintService } from '../../../../core/services/invoice-print/invoice-print-service';
import { PopupService } from '../../../../core/services/popup/popup-service';
import { Approval } from '../../../interfaces/approval/approval';
import { ApprovalItem } from '../../../interfaces/approval/approvalitem';
import { CommonModule  } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-approval-edit',
  imports: [CommonModule, FormsModule],
  templateUrl: './approval-edit.html',
  styleUrl: './approval-edit.css',
})
export class ApprovalEdit {

approval = signal<Approval | null>(null);  items: ApprovalItem[] = [];
  approvalNumber: string = '';
  currentDate: string = '';
  /** Copayment of the totals block — read-only, taken from the approval. */
  coPayment: number = 0;
  coPaymentAmount: number = 0;
  submitting = false;
  /** Shown once PullApproval has succeeded — lets the user print, same as /search-results. */
  submitted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private approvalService: ApprovalService,
    private invoicePrint: InvoicePrintService,
    private popup: PopupService
  ) {}

  ngOnInit(): void {
    this.approvalNumber = this.route.snapshot.paramMap.get('approvalNumber') || '';
    if (!this.approvalNumber) return;
    this.approvalService.getApproval(this.approvalNumber).subscribe({
      next: (data) => {
        console.log('data:', data);
        this.approval.set(data);
        // this.items = JSON.parse(JSON.stringify(data.items));
          this.items = data.items.map(item => ({
    ...item,
    originalQuantity: item.quantity
  }));
        this.coPayment = data.copaymentPercentage || 0;
        this.recalcCopayment();
      },
      error: (err) => {
        console.error(err);
        // approval could not be loaded → back to the dashboard, no "not found" card
        this.router.navigate(['/mem']);
      }
    });
  }

  getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }

  /** The approval's value limit, or null when it has none. */
  getLimit(): number | null {
    const limit = Number(this.approval()?.limit || 0);
    return limit > 0 ? limit : null;
  }

  /**
   * The amount the copayment is charged on: capped at the approval limit when
   * there is one, otherwise the whole subtotal.
   */
  getWithinLimit(): number {
    const limit = this.getLimit();
    return limit === null ? this.getSubtotal() : Math.min(this.getSubtotal(), limit);
  }

  /** Whatever the subtotal runs over the limit by — 0 when there is no limit. */
  getExceedingAmount(): number {
    const limit = this.getLimit();
    return limit === null ? 0 : Math.max(0, this.getSubtotal() - limit);
  }

  /**
   * Copayment amount = the approval's percentage of the covered amount
   * (the limit when there is one, else the whole subtotal). Read-only —
   * it's recomputed whenever a pull quantity moves the subtotal.
   */
  recalcCopayment(): void {
    this.coPaymentAmount = this.round2((this.getWithinLimit() * (this.coPayment || 0)) / 100);
  }

  /** The over-limit difference — the member carries all of it. */
  getExtraCopayment(): number {
    return this.getExceedingAmount();
  }

  getTotalCopayment(): number {
    return (this.coPaymentAmount || 0) + this.getExtraCopayment();
  }

  private round2(value: number): number {
    return parseFloat((value || 0).toFixed(2));
  }

  getTotal(): number {
    return this.getSubtotal() - this.getTotalCopayment();
  }

  /** Count of service lines that will actually be pulled (qty > 0). */
  getTotalItems(): number {
    return this.items.filter((item) => (item.quantity || 0) > 0).length;
  }

  onSubmit(): void {
    const request = {
      approvalId: Number(this.approvalNumber),
      notes: this.approval()?.notes,
      items: this.items.map(item => ({
        itemSerial: Number(item.id),
        approvedQty: item.quantity || 0,
        itemDesc: item.description,
        price: item.unitPrice,
        days: item.days ?? null
      }))
    };

    this.submitting = true;

    this.approvalService.submitChronicApproval(request).subscribe({
      next: (res) => {
        this.submitting = false;
        if (!res?.success) {
          this.popup.error('Failed', res?.msg || 'The approval could not be submitted.');
          return;
        }
        this.submitted = true;
        this.popup.success('Submitted!', 'Approval submitted successfully.');
      },
      error: (err) => {
        this.submitting = false;
        console.error(err);
        this.popup.error('Error', 'Failed to submit the approval.');
      }
    });
  }

  printInvoice(): void {
    this.invoicePrint.printApprovalById(this.approvalNumber);
  }

  goBack(): void {
    this.router.navigate(['/mem']);
  }
limitQuantity(item: any): void {
  if (
    item.originalQuantity != null &&
    item.quantity > item.originalQuantity
  ) {
    item.quantity = item.originalQuantity;
  }
  // the subtotal moved → keep the copayment amount on the same percentage
  this.recalcCopayment();
}

}
