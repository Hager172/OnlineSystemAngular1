import { Component, OnInit } from '@angular/core';
import { ApprovalDetailsDto } from '../../../interfaces/approval/approval-details-dto';
import { Approval } from '../../../../core/services/Approval/approval';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PopupService } from '../../../../core/services/popup/popup-service';

@Component({
  selector: 'app-approvalexchange',
  imports: [CommonModule, FormsModule],
  templateUrl: './approvalexchange.html',
  styleUrl: './approvalexchange.css',
})
export class Approvalexchange implements OnInit { 
  approval!: ApprovalDetailsDto | null;
  isSubmitting = false;
  isSubmitted = false;
  constructor(private approvalService: Approval, private popup: PopupService) {}

  ngOnInit(): void {
    this.approvalService.getApprovalDetails(1).subscribe({
      next: (res) => {
        this.approval = res;
        console.log('Approval Data:', this.approval);
      },
      error: (err) => {
        console.error('Error loading approval', err);
      }
    });
  }
  getSubtotal(): number {
  if (!this.approval) return 0;

  return this.approval.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);
}

getDiscountAmount(): number {
  if (!this.approval) return 0;

  return this.getSubtotal() * (this.approval.copayment / 100);
}

getGrandTotal(): number {
  return this.getSubtotal() - this.getDiscountAmount();
}
onQuantityChange(item: any){
  if(item.quantity > item.maxQuantity){
    // alert (`maximum quantity allowed is ${item.maxQuantity}`);
    this.popup.error('Invalid Quantity', `Maximum quantity allowed  is ${item.maxQuantity}`);
    item.quantity = item.maxQuantity;
  }
  if(item.quantity < 0){
    item.quantity = 0;
  }
}

submitApproval() {
  if (!this.approval) return;

  this.isSubmitting = true;

  this.approvalService.submitApproval(this.approval).subscribe({
    next: (res) => {
      this.isSubmitting = false;

      if (res.success) {
        this.isSubmitted = true;

        this.popup.success('Approval Submitted', 'Approval submitted successfully');
      }
    },
    error: () => {
      this.isSubmitting = false;

      this.popup.error('Error', 'Something went wrong');
    }
  });
}
printApproval() {
  window.print();
}
}


