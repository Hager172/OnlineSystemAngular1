import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Approval } from '../../interfaces/approval/approval';
import { ApprovalItem } from '../../interfaces/approval/approvalitem';
import { ActivatedRoute, Router } from '@angular/router';
import { ApprovalService } from '../../../core/services/Approval/approval-service';

import { Subject } from 'rxjs';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from '../../../core/services/auth/auth-service';
import { PopupService } from '../../../core/services/popup/popup-service';

/**
 * Agent response page: like approval-edit-search but the approval limit
 * (max value) is editable and gets submitted with the response.
 */
@Component({
  selector: 'app-response-approval',
  imports: [CommonModule, FormsModule, NgSelectModule, NgSelectComponent],
  templateUrl: './response-approval.html',
  styleUrl: './response-approval.css',
})
export class ResponseApproval implements OnInit {
  productSearch$ = new Subject<string>();
  productOptions: any[] = [];
  approval = signal<Approval | null>(null);
  items: ApprovalItem[] = [];
  approvalNumber: string = '';

  /** الليميت القابل للتعديل — بيتبعت للباك إند مع الرد */
  editLimit: number | null = null;

  coPayment: number = 0;
  coPaymentAmount: number = 0;
  submitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private approvalService: ApprovalService,
    private authService: AuthService,
    private popup: PopupService
  ) {}

  ngOnInit(): void {
    this.approvalNumber = this.route.snapshot.paramMap.get('approvalNumber') || '';

    if (!this.approvalNumber) return;

    this.approvalService
      .getApprovalsearchDetails(this.approvalNumber)
      .subscribe({
        next: (res) => {
          if (res && res.data) {
            const approvalData = res.data;

            this.approval.set({
              approvalNumber: approvalData.approvalId?.toString(),
              date: approvalData.approvalDate,
              notes: approvalData.notes,
              diagnose: '',
              companyName: approvalData.companyName,
              companyLogo: '',
              vendorLogo: '',
              branch: approvalData.branchName,
              invoiceNumber: approvalData.approvalId?.toString(),
              issueDate: approvalData.approvalDate,
              serviceDate: approvalData.approvalDate,
              clientName: approvalData.memberName,
              clientId: approvalData.memberId,
              clientPhone: '',
              limit: approvalData.maxValue ? approvalData.maxValue : null,
              vendorName: approvalData.vendorName,
              copaymentPercentage: approvalData.copaymentvalue,
              extraCopaymentPercentage: 0,
              items: []
            });

            this.editLimit = approvalData.maxValue ?? null;

            this.items = approvalData.services?.map((x: any) => ({
              id: x.itemSerial,
              name: x.servicename,
              description: x.itemDesc,
              quantity: x.apQty,
              originalQuantity: x.qty,
              quantityUnit: '',
              unitPrice: x.price,
              editqty: x.editqty ?? x.apQty,
              days: x.days,
              serviceId: -1,
              isNew: false
            })) || [];
          }
        },
        error: err => {
          console.log(err);
        }
      });

    this.productSearch$.subscribe(term => {
      if (!term || term.length < 3) return;
      const vendorType = this.authService.getVendorType();
      this.approvalService.getProducts(term, vendorType ?? '').subscribe(res => {
        this.productOptions = res;
      });
    });
  }

  getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + ((item.editqty || 0) * item.unitPrice), 0);
  }

  limitQuantity(item: any): void {
    if (
      item.quantity != null &&
      item.editqty > item.quantity
    ) {
      item.editqty = item.quantity;
    }
    this.updateSubTotals();
  }

  // الحسابات بتعتمد على الليميت المعدّل مش المخزن
  getWithinLimit(): number {
    return Math.min(this.getSubtotal(), this.editLimit || 0);
  }

  getExceedingAmount(): number {
    return Math.max(0, this.getSubtotal() - (this.editLimit || 0));
  }

  getRegularCopayment(): number {
    return (this.getWithinLimit() * (this.approval()?.copaymentPercentage || 0)) / 100;
  }

  getExtraCopayment(): number {
    return (this.getExceedingAmount() * (this.approval()?.extraCopaymentPercentage || 0)) / 100;
  }

  getTotalCopayment(): number {
    return this.getRegularCopayment() + this.getExtraCopayment();
  }

  getTotal(): number {
    return this.getSubtotal() - this.getTotalCopayment();
  }

  addPrescriptionItem(): void {
    this.items.push({
      id: 0,
      name: '',
      description: '',
      quantity: -1,
      editqty: 1,
      unitPrice: 0,
      days: 7,
      serviceId: 0,
      isNew: true
    });
  }

  removePrescriptionItem(index: number): void {
    this.items.splice(index, 1);
    this.updateSubTotals();
  }

  onProductSelect(selectedProduct: any, item: any): void {
    if (selectedProduct) {
      item.serviceId = selectedProduct.id;
      item.name = selectedProduct.name;
      item.unitPrice = selectedProduct.price || 0;
    } else {
      item.serviceId = 0;
      item.name = '';
      item.unitPrice = 0;
    }
    this.updateSubTotals();
  }

  onProductSearch($event: any): void {
    const term = $event?.term;
    if (term && term.length >= 2) {
      this.productSearch$.next(term);
    } else if (!term || term.length === 0) {
      this.productOptions = [];
    }
  }

  onProductClear(): void {
    this.productOptions = [];
    this.productSearch$.next('');
  }

  calculateTotal(item: any): string {
    return ((item.unitPrice || 0) * (item.editqty || 0)).toFixed(2);
  }

  calculateSubTotal(): string {
    const total = this.items.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.editqty || 0)), 0);
    return total.toFixed(2);
  }

  updateSubTotals(): void {
    const subTotal = parseFloat(this.calculateSubTotal());
    if (this.coPayment > 0) {
      this.coPaymentAmount = parseFloat(((subTotal * this.coPayment) / 100).toFixed(2));
    } else if (this.coPaymentAmount > 0 && subTotal > 0) {
      this.coPayment = parseFloat(((this.coPaymentAmount / subTotal) * 100).toFixed(2));
    }
  }

  goBack(): void {
    this.router.navigate(['/approvalreport']);
  }

  /** Count of service lines that remain in the response (edit qty > 0). */
  getTotalItems(): number {
    return this.items.filter((item) => (item.editqty || 0) > 0).length;
  }

  onSubmit(): void {
    if (this.editLimit == null || this.editLimit < 0) {
      this.popup.error('Validation Error', 'Approval Limit is required and must be 0 or more.');
      return;
    }

    // UpdateClaims only updates existing approval_services rows by ItemSerial —
    // it has no insert path, so newly added rows can't be sent here.
    const items = this.items.filter(item => !item.isNew);

    const request = {
      approvalId: this.approval()?.approvalNumber,
      notes: this.approval()?.notes,
      isChronic: false,
      items: items.map(item => ({
        itemSerial: item.id,
        qty: Number(item.editqty) || 0,
        claimed: Number(item.quantity) || 0,
        days: item.days != null ? String(item.days) : null,
        description: item.description
      }))
    };

    this.submitting = true;

    this.approvalService.respondToApproval(request).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res?.data === '-1') {
          this.popup.error('Rejected', 'The response could not be submitted — check the quantities and your permissions.');
          return;
        }
        this.popup.success('Saved!', 'Approval response submitted successfully.').then(() => this.goBack());
      },
      error: err => {
        this.submitting = false;
        console.error(err);
        this.popup.error('Error', 'Failed to submit the approval response.');
      }
    });
  }
}
