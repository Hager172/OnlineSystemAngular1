import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Approval } from '../../interfaces/approval/approval';
import { ApprovalItem } from '../../interfaces/approval/approvalitem';
import { ActivatedRoute,Router } from '@angular/router';
import { ApprovalService } from '../../../core/services/Approval/approval-service';

import { Subject } from 'rxjs';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from '../../../core/services/auth/auth-service';
import { PopupService } from '../../../core/services/popup/popup-service';

@Component({
  selector: 'app-approval-edit-search',
  imports: [CommonModule, FormsModule,NgSelectModule,NgSelectComponent],
  templateUrl: './approval-edit-search.html',
  styleUrl: './approval-edit-search.css',
})
export class ApprovalEditSearch {
productSearch$ = new Subject<string>();
  productOptions: any[] = [];
approval = signal<Approval | null>(null);  items: ApprovalItem[] = [];
  approvalNumber: string = '';
  currentDate: string = '';
coPayment: number = 0;
  coPaymentAmount: number = 0;
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
        console.log(res);

        // تأكد أن الكائن data موجود في الرد قبل استخدامه
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
limit: approvalData.maxValue ?? null,
vendorName: approvalData.vendorName,
            copaymentPercentage: approvalData.copaymentvalue,
            extraCopaymentPercentage: 0,
            items: []
          });

          // تم تعديل الوصول للمصفوفة لتصبح approvalData.services بدلاً من res.services
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
      const vendorType = this.authService.getVendorType() ;
      this.approvalService.getProducts(term, vendorType??'').subscribe(res => {
        this.productOptions = res;
      });
    });
  }


getSubtotal(): number {
  return this.items.reduce((sum, item) => sum + ((item.editqty || 0) * item.unitPrice), 0);
}

// 3. تعديل دالة الليميت لو حابه تطبقيها على الـ editqty:
limitQuantity(item: any): void {
  if (
    item.quantity != null &&
    item.editqty > item.quantity
  ) {
    item.editqty = item.quantity;
  }
  this.updateSubTotals();
}

  getWithinLimit(): number {
    return Math.min(this.getSubtotal(), this.approval()?.limit || 0);
  }

  getExceedingAmount(): number {
    return Math.max(0, this.getSubtotal() - (this.approval()?.limit || 0));
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

  // عند اختيار منتج من الـ سيلكت المضاف حديثاً
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

  // ==========================================
  // دوال الحسابات التلقائية (تعتمد على editqty)
  // ==========================================
  
  calculateTotal(item: any): string {
    return ((item.unitPrice || 0) * (item.editqty || 0)).toFixed(2);
  }

  calculateSubTotal(): string {
    const total = this.items.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.editqty || 0)), 0);
    return total.toFixed(2);
  }

  calculateNet(): string {
    const subTotal = parseFloat(this.calculateSubTotal());
    return (subTotal - (this.coPaymentAmount || 0)).toFixed(2);
  }

  onCoPaymentChange(): void {
    const subTotal = parseFloat(this.calculateSubTotal());
    this.coPaymentAmount = parseFloat(((subTotal * this.coPayment) / 100).toFixed(2));
  }

  onCoAmountChange(): void {
    const subTotal = parseFloat(this.calculateSubTotal());
    if (subTotal > 0) {
      this.coPayment = parseFloat(((this.coPaymentAmount || 0) / subTotal * 100).toFixed(2));
    } else {
      this.coPayment = 0;
    }
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
    this.router.navigate(['/search-results']);
  }

  /** Count of service lines that remain in the request (edit qty > 0). */
  getTotalItems(): number {
    return this.items.filter((item) => (item.editqty || 0) > 0).length;
  }
onSubmit(): void {

  const request = {
  approval: {
    approvalId: Number(this.approval()?.approvalNumber),
    notes: this.approval()?.notes,
    services: this.items.map(item => ({
      itemSerial: item.id,
      serviceId: item.isNew ? item.serviceId : -1,
      editqty: item.editqty,
      days: item.days,
      itemDesc: item.description,
      price: item.unitPrice
    }))
  }
};


  console.log(request);

this.approvalService.editApproval(request).subscribe({
  next: () => {
    this.popup.success('Saved!', 'Approval updated successfully.');


  },
  error: err => {
    console.error(err);

    this.popup.error('Error', 'Failed to update approval.');
  }
});  //   next: () => {
  //     Swal.fire(
  //       'Saved!',
  //       'Approval updated successfully.',
  //       'success'
  //     );

  //     this.goBack();
  //   },
  //   error: err => {
  //     console.error(err);

  //     Swal.fire(
  //       'Error',
  //       'Failed to update approval.',
  //       'error'
  //     );
  //   }
  // });
}

}
