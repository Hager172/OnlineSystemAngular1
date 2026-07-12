import { Component, OnInit, signal } from '@angular/core';
import { Approval } from '../../../interfaces/approval/approval';
import { ApprovalItem } from '../../../interfaces/approval/approvalitem';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApprovalService } from '../../../../core/services/Approval/approval-service';
import { CommonModule  } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-invoice-print',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './invoice-print.html',
  styleUrl: './invoice-print.css',
})
export class InvoicePrint implements OnInit {
  approval = signal<Approval | null>(null);
  items = signal<ApprovalItem[]>([]);
  approvalNumber: string = '';
  currentDate: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private approvalService: ApprovalService
  ) {}

  ngOnInit(): void {
    this.approvalNumber = this.route.snapshot.paramMap.get('approvalNumber') || '';
    this.approvalService.getApprovalView(this.approvalNumber).subscribe({
    next: (data) => {
      console.log('data:', data);
    this.approval.set(data);
    const editedItems = this.approvalService.getEditedItems(this.approvalNumber);
    this.items.set(editedItems || data.items);
    
  },
  error: (err) => {
    console.error(err);
    this.approval.set(null);
    this.items.set([]);
  }
});
  }

  getSubtotal(): number {
    return this.items().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
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

  getGrandTotal(): number {
    return this.getSubtotal() - this.getTotalCopayment();
  }

  goBack(): void {
    this.router.navigate(['/approval-edit', this.approvalNumber]);
  }

  print(): void {
    window.print();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

}
