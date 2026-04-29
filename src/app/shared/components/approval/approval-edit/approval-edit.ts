import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApprovalService } from '../../../../core/services/Approval/approval-service';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private approvalService: ApprovalService
  ) {}

  ngOnInit(): void {
    this.approvalNumber = this.route.snapshot.paramMap.get('approvalNumber') || '';
    if (!this.approvalNumber) return;
    this.approvalService.getApproval(this.approvalNumber).subscribe({
      next: (data) => {
        console.log('data:', data);
        this.approval.set(data);
        this.items = JSON.parse(JSON.stringify(data.items));
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
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

  onSubmit(): void {
    this.approvalService.saveEditedItems(this.approvalNumber, this.items);
    this.router.navigate(['/invoice-print', this.approvalNumber]);
  }

  goBack(): void {
    this.router.navigate(['/appinput']);
  }
//   goBack(): void {
//   window.history.state.backData = { approvalNumber: this.approvalNumber };
//   window.history.back();
// }

}
